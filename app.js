const STORAGE_KEY = "vbb-jobcard-generator-state-v1";
let deferredInstallPrompt = null;

const el = {
  jobCardNumber: document.getElementById("jobCardNumber"),
  jobStatus: document.getElementById("jobStatus"),
  jobCardDate: document.getElementById("jobCardDate"),
  completionDate: document.getElementById("completionDate"),
  technician: document.getElementById("technician"),
  logoFile: document.getElementById("logoFile"),
  clientName: document.getElementById("clientName"),
  clientContact: document.getElementById("clientContact"),
  clientAddress: document.getElementById("clientAddress"),
  jobSummary: document.getElementById("jobSummary"),
  materials: document.getElementById("materials"),
  assetsContainer: document.getElementById("assetsContainer"),
  addAssetBtn: document.getElementById("addAssetBtn"),
  generateBtn: document.getElementById("generateBtn"),
  copyBtn: document.getElementById("copyBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  resetBtn: document.getElementById("resetBtn"),
  installBtn: document.getElementById("installBtn"),
  output: document.getElementById("output"),
  statusBadge: document.getElementById("statusBadge"),
  assetTemplate: document.getElementById("assetTemplate")
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
  } catch (_) {
    // ignore storage failures
  }
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function createAssetCard(assetData = {}) {
  const fragment = el.assetTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".asset-card");
  const title = fragment.querySelector(".asset-title");
  const removeBtn = fragment.querySelector(".remove-asset");

  const values = {
    assetTitle: assetData.assetTitle || "",
    serialized: assetData.serialized || "yes",
    serial: assetData.serial || "",
    item: assetData.item || "",
    fault: assetData.fault || "",
    workPerformed: assetData.workPerformed || "",
    notes: assetData.notes || ""
  };

  card.querySelectorAll("[data-field]").forEach(input => {
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
    generateOutput();
    saveState();
  });

  el.assetsContainer.appendChild(fragment);
  toggleSerialState(el.assetsContainer.lastElementChild);
  refreshAssetLabels();
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
    if (!titleField.value.trim()) {
      titleField.value = `Asset ${index + 1}`;
    }
    titleEl.textContent = titleField.value.trim() || `Asset ${index + 1}`;
  });
}

function populateForm(data) {
  el.jobCardNumber.value = data.jobCardNumber || DEFAULTS.jobCardNumber;
  el.jobStatus.value = data.jobStatus || DEFAULTS.jobStatus;
  el.jobCardDate.value = data.jobCardDate || DEFAULTS.jobCardDate;
  el.completionDate.value = data.completionDate || DEFAULTS.completionDate;
  el.technician.value = data.technician || DEFAULTS.technician;
  el.logoFile.value = data.logoFile || DEFAULTS.logoFile;
  el.clientName.value = data.clientName || DEFAULTS.clientName;
  el.clientContact.value = data.clientContact || DEFAULTS.clientContact;
  el.clientAddress.value = data.clientAddress || DEFAULTS.clientAddress;
  el.jobSummary.value = data.jobSummary || DEFAULTS.jobSummary;
  el.materials.value = data.materials || defaultMaterialText();
  el.assetsContainer.innerHTML = "";
  (data.assets?.length ? data.assets : DEFAULTS.assets).forEach(asset => createAssetCard(asset));
}

function loadDefaults() {
  populateForm({
    ...DEFAULTS,
    materials: defaultMaterialText()
  });
  generateOutput();
  saveState();
}

function collectData() {
  const assets = [...el.assetsContainer.children].map(card => ({
    assetTitle: card.querySelector('[data-field="assetTitle"]').value.trim(),
    serialized: card.querySelector('[data-field="serialized"]').value,
    serial: card.querySelector('[data-field="serial"]').value.trim(),
    item: card.querySelector('[data-field="item"]').value.trim(),
    fault: card.querySelector('[data-field="fault"]').value.trim(),
    workPerformed: card.querySelector('[data-field="workPerformed"]').value.trim(),
    notes: card.querySelector('[data-field="notes"]').value.trim()
  }));

  return {
    jobCardNumber: el.jobCardNumber.value.trim(),
    jobStatus: el.jobStatus.value.trim(),
    jobCardDate: el.jobCardDate.value.trim(),
    completionDate: el.completionDate.value.trim(),
    technician: el.technician.value.trim(),
    logoFile: el.logoFile.value.trim(),
    clientName: el.clientName.value.trim(),
    clientContact: el.clientContact.value.trim(),
    clientAddress: el.clientAddress.value.trim(),
    jobSummary: el.jobSummary.value.trim(),
    materials: el.materials.value.trim(),
    assets
  };
}

function generateOutput() {
  const data = collectData();
  const output = renderJobCardLatex(data);
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
  const text = el.output.value;
  await navigator.clipboard.writeText(text);
  setBadge("Copied");
  window.setTimeout(() => setBadge("Generated"), 1200);
}

function downloadOutput() {
  const data = collectData();
  const fileStem = (data.jobCardNumber || "job-card")
    .replace(/[^\w.-]+/g, "_");
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
      try {
        await navigator.serviceWorker.register("./sw.js");
      } catch (_) {
        // silent fail
      }
    });
  }

  window.addEventListener("beforeinstallprompt", event => {
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

el.addAssetBtn.addEventListener("click", () => {
  createAssetCard({
    assetTitle: `Asset ${el.assetsContainer.children.length + 1}`,
    serialized: "yes",
    serial: "",
    item: "",
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
  el.jobCardNumber, el.jobStatus, el.jobCardDate, el.completionDate,
  el.technician, el.logoFile, el.clientName, el.clientContact,
  el.clientAddress, el.jobSummary, el.materials
].forEach(input => input.addEventListener("input", onFormMutation));

const savedState = loadSavedState();
if (savedState) {
  populateForm(savedState);
  generateOutput();
} else {
  loadDefaults();
}

initPWA();
