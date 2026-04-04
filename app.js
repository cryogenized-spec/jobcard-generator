const STORAGE_KEY = "vbb-paperwork-generator-state-v2";
let deferredInstallPrompt = null;
let currentMode = DEFAULTS.mode || "withdrawal";

const el = {
  withdrawalNumber: document.getElementById("withdrawalNumber"),
  jobCardNumber: document.getElementById("jobCardNumber"),
  invoiceNumber: document.getElementById("invoiceNumber"),
  issuedDate: document.getElementById("issuedDate"),
  completionDate: document.getElementById("completionDate"),
  dueDate: document.getElementById("dueDate"),
  status: document.getElementById("status"),
  technician: document.getElementById("technician"),
  logoFile: document.getElementById("logoFile"),
  clientName: document.getElementById("clientName"),
  clientContact: document.getElementById("clientContact"),
  clientAddress: document.getElementById("clientAddress"),
  withdrawalPurpose: document.getElementById("withdrawalPurpose"),
  jobSummary: document.getElementById("jobSummary"),
  invoiceNotes: document.getElementById("invoiceNotes"),
  materials: document.getElementById("materials"),
  assetsContainer: document.getElementById("assetsContainer"),
  addAssetBtn: document.getElementById("addAssetBtn"),
  generateBtn: document.getElementById("generateBtn"),
  copyBtn: document.getElementById("copyBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  resetBtn: document.getElementById("resetBtn"),
  installBtn: document.getElementById("installBtn"),
  output: document.getElementById("output"),
  outputTitle: document.getElementById("outputTitle"),
  statusBadge: document.getElementById("statusBadge"),
  assetTemplate: document.getElementById("assetTemplate"),
  modeButtons: [...document.querySelectorAll("[data-mode-btn]")],
  modeBoundElements: [...document.querySelectorAll("[data-modes]")]
};

function setBadge(text) {
  el.statusBadge.textContent = text;
}

function defaultMaterialText() {
  return DEFAULTS.materials.join("\n");
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
  } catch (_) {}
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function createAssetCard(assetData = {}) {
  const fragment = el.assetTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".asset-card");
  const removeBtn = fragment.querySelector(".remove-asset");
  const values = {
    assetTitle: assetData.assetTitle || "",
    serialized: assetData.serialized || "yes",
    quantity: assetData.quantity || "1",
    serial: assetData.serial || "",
    item: assetData.item || "",
    amount: assetData.amount || "",
    conditionOut: assetData.conditionOut || "",
    intendedUse: assetData.intendedUse || "",
    fault: assetData.fault || "",
    workPerformed: assetData.workPerformed || "",
    notes: assetData.notes || ""
  };

  card.querySelectorAll("[data-field]").forEach((input) => {
    const field = input.dataset.field;
    input.value = values[field] ?? "";
    input.addEventListener("input", onFormMutation);
    input.addEventListener("change", () => {
      if (field === "serialized") toggleSerialState(card);
      onFormMutation();
    });
  });

  removeBtn.addEventListener("click", () => {
    card.remove();
    refreshAssetLabels();
    applyModeVisibility(card);
    generateOutput();
    saveState();
  });

  el.assetsContainer.appendChild(fragment);
  const inserted = el.assetsContainer.lastElementChild;
  toggleSerialState(inserted);
  refreshAssetLabels();
  applyModeVisibility(inserted);
}

function toggleSerialState(card) {
  const serialized = card.querySelector('[data-field="serialized"]').value;
  const serialInput = card.querySelector('[data-field="serial"]');
  const serialLabel = serialInput.closest("label");
  serialInput.disabled = serialized === "no";
  serialLabel.style.opacity = serialized === "no" ? "0.65" : "1";
  serialInput.placeholder = serialized === "no" ? "Optional internal reference" : "S6MR0115000178";
}

function refreshAssetLabels() {
  [...el.assetsContainer.children].forEach((card, index) => {
    const titleEl = card.querySelector(".asset-title");
    const titleField = card.querySelector('[data-field="assetTitle"]');
    if (!titleField.value.trim()) titleField.value = `Line ${index + 1}`;
    titleEl.textContent = titleField.value.trim() || `Line ${index + 1}`;
  });
}

function applyModeVisibility(scope = document) {
  const targets = scope.querySelectorAll ? scope.querySelectorAll("[data-modes]") : [];
  targets.forEach((node) => {
    const modes = (node.dataset.modes || "").split(/\s+/).filter(Boolean);
    node.dataset.hidden = modes.length && !modes.includes(currentMode) ? "true" : "false";
  });
}

function setMode(mode) {
  currentMode = mode;
  el.modeButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.modeBtn === mode));
  applyModeVisibility(document);
  const titles = {
    withdrawal: "Generated stock withdrawal LuaLaTeX",
    jobcard: "Generated job card LuaLaTeX",
    invoice: "Generated invoice LuaLaTeX"
  };
  el.outputTitle.textContent = titles[mode] || "Generated LuaLaTeX";
  generateOutput();
  saveState();
}

function populateForm(data) {
  currentMode = data.mode || DEFAULTS.mode;
  el.withdrawalNumber.value = data.withdrawalNumber || DEFAULTS.withdrawalNumber;
  el.jobCardNumber.value = data.jobCardNumber || DEFAULTS.jobCardNumber;
  el.invoiceNumber.value = data.invoiceNumber || DEFAULTS.invoiceNumber;
  el.issuedDate.value = data.issuedDate || DEFAULTS.issuedDate;
  el.completionDate.value = data.completionDate || DEFAULTS.completionDate;
  el.dueDate.value = data.dueDate || DEFAULTS.dueDate;
  el.status.value = data.status || DEFAULTS.status;
  el.technician.value = data.technician || DEFAULTS.technician;
  el.logoFile.value = data.logoFile || DEFAULTS.logoFile;
  el.clientName.value = data.clientName || DEFAULTS.clientName;
  el.clientContact.value = data.clientContact || DEFAULTS.clientContact;
  el.clientAddress.value = data.clientAddress || DEFAULTS.clientAddress;
  el.withdrawalPurpose.value = data.withdrawalPurpose || DEFAULTS.withdrawalPurpose;
  el.jobSummary.value = data.jobSummary || DEFAULTS.jobSummary;
  el.invoiceNotes.value = data.invoiceNotes || DEFAULTS.invoiceNotes;
  el.materials.value = data.materials || defaultMaterialText();
  el.assetsContainer.innerHTML = "";
  (data.assets?.length ? data.assets : DEFAULTS.assets).forEach((asset) => createAssetCard(asset));
  setMode(currentMode);
}

function loadDefaults() {
  populateForm({ ...DEFAULTS, materials: defaultMaterialText() });
}

function collectData() {
  const assets = [...el.assetsContainer.children].map((card) => ({
    assetTitle: card.querySelector('[data-field="assetTitle"]').value.trim(),
    serialized: card.querySelector('[data-field="serialized"]').value,
    quantity: card.querySelector('[data-field="quantity"]').value.trim(),
    serial: card.querySelector('[data-field="serial"]').value.trim(),
    item: card.querySelector('[data-field="item"]').value.trim(),
    amount: card.querySelector('[data-field="amount"]').value.trim(),
    conditionOut: card.querySelector('[data-field="conditionOut"]').value.trim(),
    intendedUse: card.querySelector('[data-field="intendedUse"]').value.trim(),
    fault: card.querySelector('[data-field="fault"]').value.trim(),
    workPerformed: card.querySelector('[data-field="workPerformed"]').value.trim(),
    notes: card.querySelector('[data-field="notes"]').value.trim()
  }));

  return {
    mode: currentMode,
    withdrawalNumber: el.withdrawalNumber.value.trim(),
    jobCardNumber: el.jobCardNumber.value.trim(),
    invoiceNumber: el.invoiceNumber.value.trim(),
    issuedDate: el.issuedDate.value.trim(),
    completionDate: el.completionDate.value.trim(),
    dueDate: el.dueDate.value.trim(),
    status: el.status.value.trim(),
    technician: el.technician.value.trim(),
    logoFile: el.logoFile.value.trim(),
    clientName: el.clientName.value.trim(),
    clientContact: el.clientContact.value.trim(),
    clientAddress: el.clientAddress.value.trim(),
    withdrawalPurpose: el.withdrawalPurpose.value.trim(),
    jobSummary: el.jobSummary.value.trim(),
    invoiceNotes: el.invoiceNotes.value.trim(),
    materials: el.materials.value.trim(),
    assets
  };
}

function generateOutput() {
  const data = collectData();
  let output = "";
  if (currentMode === "withdrawal") output = renderStockWithdrawalLatex(data);
  if (currentMode === "jobcard") output = renderJobCardLatex(data);
  if (currentMode === "invoice") output = renderInvoiceLatex(data);
  el.output.value = output;
  setBadge("Generated");
  return output;
}

function onFormMutation() {
  refreshAssetLabels();
  generateOutput();
  saveState();
}

async function copyOutput() {
  await navigator.clipboard.writeText(el.output.value);
  setBadge("Copied");
  window.setTimeout(() => setBadge("Generated"), 1200);
}

function activeFileStem(data) {
  const map = {
    withdrawal: data.withdrawalNumber || DEFAULTS.withdrawalNumber,
    jobcard: data.jobCardNumber || DEFAULTS.jobCardNumber,
    invoice: data.invoiceNumber || DEFAULTS.invoiceNumber
  };
  return (map[currentMode] || "paperwork").replace(/[^\w.-]+/g, "_");
}

function downloadOutput() {
  const data = collectData();
  const fileStem = activeFileStem(data);
  const blob = new Blob([el.output.value], { type: "text/x-tex;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileStem}.tex`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setBadge("Downloaded");
  window.setTimeout(() => setBadge("Generated"), 1200);
}

function initPWA() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try { await navigator.serviceWorker.register("./sw.js"); } catch (_) {}
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    el.installBtn.hidden = false;
  });

  el.installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    el.installBtn.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    el.installBtn.hidden = true;
    setBadge("Installed");
  });
}

el.modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.modeBtn));
});

el.addAssetBtn.addEventListener("click", () => {
  createAssetCard({
    assetTitle: `Line ${el.assetsContainer.children.length + 1}`,
    serialized: "yes",
    quantity: "1",
    serial: "",
    item: "",
    amount: "",
    conditionOut: "",
    intendedUse: "",
    fault: "",
    workPerformed: "",
    notes: ""
  });
  generateOutput();
  saveState();
});

el.generateBtn.addEventListener("click", generateOutput);
el.copyBtn.addEventListener("click", () => copyOutput().catch(() => setBadge("Copy failed")));
el.downloadBtn.addEventListener("click", downloadOutput);
el.resetBtn.addEventListener("click", loadDefaults);

[
  el.withdrawalNumber, el.jobCardNumber, el.invoiceNumber, el.issuedDate,
  el.completionDate, el.dueDate, el.status, el.technician, el.logoFile,
  el.clientName, el.clientContact, el.clientAddress, el.withdrawalPurpose,
  el.jobSummary, el.invoiceNotes, el.materials
].forEach((input) => input.addEventListener("input", onFormMutation));

const savedState = loadSavedState();
if (savedState) {
  populateForm(savedState);
} else {
  loadDefaults();
}

initPWA();
