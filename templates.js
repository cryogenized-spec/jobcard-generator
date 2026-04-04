const BUSINESS = {
  name: "Vanguard Blade & Bolt",
  issuedBy: "Gareth Van Tonder",
  address: "52 Townview Road, Lot 14, Glenhills",
  email: "Cryogenized@gmail.com"
};

const DEFAULTS = {
  mode: "withdrawal",
  logoFile: "logo-square.png",
  withdrawalNumber: "NS-WD-2026-001",
  jobCardNumber: "NS-JC-2026-002",
  invoiceNumber: "VBB-2026-001",
  issuedDate: "03.04.2026",
  completionDate: "03.04.2026",
  dueDate: "03.04.2026",
  clientName: "NeonSales",
  clientContact: "0328800863",
  clientAddress: "19 Mahatma Ghandi Street, KwaDukuza, KwaZulu-Natal, South Africa",
  technician: "Gareth Van Tonder",
  status: "Completed",
  withdrawalPurpose: "Stock withdrawn for workshop use, repair, testing, and related service work.",
  jobSummary: "Service and repair work completed on workshop items recorded below, with notes captured per serialized or unserialized unit as applicable.",
  invoiceNotes: "Thank you for your business.",
  materials: [
    "O-ring AS568-015 U-90 (failed original type)",
    "Buna-N replacement O-ring from workshop spares"
  ],
  assets: [
    {
      assetTitle: "Line 1",
      serialized: "yes",
      quantity: "1",
      serial: "S6MR0115000178",
      item: "SPYDER MR-6 .68 CAL MARKER",
      amount: "75.00",
      conditionOut: "Serviceable",
      intendedUse: "Repair / testing",
      fault: "Leaking. O-ring AS568-015 U-90 disintegration. Likely cause: hydrolysis.",
      workPerformed: "Failed seal replaced with a Buna-N O-ring from the spares bag. Replacement selected as a superior option for chemical resistance in static positions.",
      notes: "Marker fitted with a stiff upgraded hammer spring.\nEKO valve pin is the broad-stem upgraded variant."
    },
    {
      assetTitle: "Line 2",
      serialized: "yes",
      quantity: "1",
      serial: "S6MR0115001357",
      item: "SPYDER MR-6 .68 CAL MARKER",
      amount: "45.00",
      conditionOut: "Brand new condition",
      intendedUse: "Repair / testing",
      fault: "Charging handle spring slipped through the backstop.\nLeak issue identical to Line 1: O-ring AS568-015 U-90 disintegration, likely caused by hydrolysis.",
      workPerformed: "Charging handle spring corrected by straightening the crooked end, reversing it in the groove, and reinstalling it with the charging handle.\nCharging handle now resets to position after release as normal.\nLeak rectified using an AS568-015 equivalent O-ring.",
      notes: "Marker came packaged with a SPYDER VICTOR spares kit.\nO-rings are dimensionally compatible, so the included spare was used as required.\nMarker is otherwise in brand new condition."
    }
  ]
};

function escapeLatex(value = "") {
  return String(value)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function linesToItems(text = "") {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function latexBullets(text = "", noneText = "None recorded.") {
  const lines = linesToItems(text);
  if (!lines.length) return "\\begin{itemize}\n        \\item " + escapeLatex(noneText) + "\n    \\end{itemize}";
  return [
    "\\begin{itemize}",
    ...lines.map((line) => `        \\item ${escapeLatex(line)}`),
    "    \\end{itemize}"
  ].join("\n");
}

function latexParagraph(text = "", noneText = "None recorded.") {
  const lines = linesToItems(text);
  return escapeLatex(lines.join(" ") || noneText);
}

function moneyNumber(value) {
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatRand(value) {
  return `R\\,${moneyNumber(value).toFixed(2)}`;
}

function serialDisplay(asset) {
  if (asset.serialized === "no") return "N/A (unserialized item)";
  return asset.serial?.trim() || "N/A";
}

function renderHeaderCommon(kind, refNo, issuedDate, secondDateLabel, secondDateValue, status, logoFile) {
  const businessName = escapeLatex(BUSINESS.name);
  return `
% ---------------------------
% Editable fields
% ---------------------------
\\newcommand{\\BusinessName}{${businessName}}
\\newcommand{\\IssuedBy}{${escapeLatex(BUSINESS.issuedBy)}}
\\newcommand{\\BusinessAddress}{${escapeLatex(BUSINESS.address)}}
\\newcommand{\\BusinessEmail}{${escapeLatex(BUSINESS.email)}}
\\newcommand{\\LogoFile}{${escapeLatex(logoFile || DEFAULTS.logoFile)}}
\\newcommand{\\PrimaryRefNo}{${escapeLatex(refNo)}}
\\newcommand{\\IssuedDate}{${escapeLatex(issuedDate)}}
\\newcommand{\\SecondDateLabel}{${escapeLatex(secondDateLabel)}}
\\newcommand{\\SecondDateValue}{${escapeLatex(secondDateValue)}}
\\newcommand{\\DocStatus}{${escapeLatex(status)}}

% ---------------------------
% Logo block
% ---------------------------
\\newcommand{\\LogoBlock}{
\\IfFileExists{\\LogoFile}{
    \\includegraphics[width=4.0cm,height=4.0cm,keepaspectratio]{\\LogoFile}
}{
    \\begin{tikzpicture}
        \\draw[line width=0.8pt, color=bronze] (0,0) rectangle (4,4);
        \\draw[line width=0.5pt, color=bronze] (0.2,0.2) rectangle (3.8,3.8);
        \\node[align=center,text=steel,font=\\bfseries] at (2,2.25) {LOGO};
        \\node[align=center,text=textgray,font=\\scriptsize] at (2,1.45) {1:1 placeholder};
        \\node[align=center,text=textgray,font=\\scriptsize] at (2,0.8) {\\texttt{\\LogoFile}};
    \\end{tikzpicture}
}
}
`;
}

function documentPreamble(titleText, footerRight) {
  return String.raw`\documentclass[11pt,a4paper]{article}

\usepackage[a4paper,margin=15mm]{geometry}
\usepackage{fontspec}
\usepackage{graphicx}
\usepackage[table]{xcolor}
\usepackage{array}
\usepackage{tabularx}
\usepackage{booktabs}
\usepackage{ragged2e}
\usepackage{fancyhdr}
\usepackage{tikz}
\usepackage[most]{tcolorbox}
\usepackage{enumitem}
\usepackage{lastpage}
\usepackage{needspace}

\setmainfont{TeX Gyre Heros}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\renewcommand{\arraystretch}{1.18}

% ---------------------------
% Colours
% ---------------------------
\definecolor{ink}{HTML}{1D2328}
\definecolor{steel}{HTML}{2F3A40}
\definecolor{bronze}{HTML}{9A6C3A}
\definecolor{paperline}{HTML}{D8D8D8}
\definecolor{soft}{HTML}{F7F7F7}
\definecolor{softbronze}{HTML}{F4EEE7}
\definecolor{textgray}{HTML}{5E5E5E}

% ---------------------------
% Page style
% ---------------------------
\pagestyle{fancy}
\fancyhf{}
\fancyfoot[L]{\color{textgray}\small ${escapeLatex(BUSINESS.name)}}
\fancyfoot[R]{\color{textgray}\small ${escapeLatex(footerRight)}}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

% ---------------------------
% Box style
% ---------------------------
\tcbset{
    enhanced,
    sharp corners,
    boxrule=0.6pt,
    colframe=paperline,
    colback=white,
    left=3.5mm,
    right=3.5mm,
    top=3mm,
    bottom=3mm,
    before skip=3mm,
    after skip=0mm
}

% ---------------------------
% List spacing
% ---------------------------
\setlist[itemize]{
    leftmargin=5mm,
    itemsep=0.8mm,
    topsep=0.8mm,
    parsep=0pt,
    partopsep=0pt
}

% ---------------------------
% Small helpers
% ---------------------------
\newcommand{\SectionLabel}[1]{\vspace{1.6mm}{\bfseries #1}\par\vspace{0.8mm}}
\newcommand{\FieldRow}[2]{\textbf{#1} & #2\\}
`;
}

function renderTopHeader(titleWord, detailsTitle, client, technicianLine) {
  return `
\\begin{document}

% Top bar
\\begin{tcolorbox}[colback=ink,colframe=ink,boxrule=0pt,left=5mm,right=5mm,top=3mm,bottom=3mm,before skip=0mm]
    {\\color{white}\\Large\\bfseries ${escapeLatex(titleWord)}}
\\end{tcolorbox}

% Header
\\begin{minipage}[t]{0.20\\textwidth}
    \\LogoBlock
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.42\\textwidth}
    \\vspace*{10mm}
    {\\raggedright\\LARGE\\bfseries\\color{steel} \\BusinessName\\par}
    \\vspace{1.5mm}
    {\\color{bronze}\\rule{\\linewidth}{0.9pt}} \\[2mm]
    {\\bfseries Issued by:} \\IssuedBy \\
    \\BusinessAddress \\
    \\texttt{\\BusinessEmail}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.34\\textwidth}
    \\vspace*{6mm}
    \\begin{tcolorbox}[
        enhanced,
        sharp corners,
        boxrule=0.7pt,
        colframe=bronze,
        colback=softbronze,
        left=4.5mm,
        right=4.5mm,
        top=4mm,
        bottom=4mm,
        before skip=0mm,
        after skip=0mm,
        width=\\linewidth
    ]
        {\\color{steel}\\normalsize\\bfseries ${escapeLatex(detailsTitle)}}\\par
        \\vspace{2.5mm}

        \\small
        \\renewcommand{\\arraystretch}{1.22}
        \\begin{tabularx}{\\linewidth}{@{}p{20mm}>{\\raggedright\\arraybackslash}X@{}}
        \\textbf{No.}       & \\PrimaryRefNo \\
        \\textbf{Issued}    & \\IssuedDate \\
        \\textbf{\\SecondDateLabel} & \\SecondDateValue \\
        \\textbf{Status}    & \\DocStatus \\
        \\end{tabularx}
    \\end{tcolorbox}
\\end{minipage}

% Client / Technician
\\begin{minipage}[t]{0.58\\textwidth}
    \\vspace{0pt}
    \\begin{tcolorbox}[colback=soft,colframe=paperline]
        {\\bfseries\\color{steel} Client}\\par
        \\vspace{1mm}
        ${escapeLatex(client.name)} \\
        ${escapeLatex(client.contact)} \\
        ${escapeLatex(client.address)}
    \\end{tcolorbox}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.38\\textwidth}
    \\vspace{0pt}
    \\begin{tcolorbox}[colback=soft,colframe=paperline]
        {\\bfseries\\color{steel} Technician / Reference}\\par
        \\vspace{1mm}
        ${technicianLine}
    \\end{tcolorbox}
\\end{minipage}
`;
}

function renderWithdrawalTableRows(assets) {
  return assets.map((asset) => {
    const qty = escapeLatex(asset.quantity || "1");
    const item = escapeLatex(asset.item || "UNSPECIFIED ITEM");
    const serial = escapeLatex(serialDisplay(asset));
    const condition = escapeLatex(asset.conditionOut || "Not stated");
    const use = escapeLatex(asset.intendedUse || "Workshop use");
    return `${qty} & ${item} & ${serial} & ${condition} & ${use} \\`;
  }).join("\n\n");
}

function renderStockWithdrawalLatex(data) {
  const assets = data.assets?.length ? data.assets : DEFAULTS.assets;
  const materialsBody = latexBullets(data.materials, "No materials referenced.");
  const preamble = documentPreamble("STOCK WITHDRAWAL", `Stock Withdrawal \#${data.withdrawalNumber || DEFAULTS.withdrawalNumber}`);
  const headerFields = renderHeaderCommon("withdrawal", data.withdrawalNumber || DEFAULTS.withdrawalNumber, data.issuedDate || DEFAULTS.issuedDate, "Purpose", "See notes", data.status || DEFAULTS.status, data.logoFile || DEFAULTS.logoFile);
  const top = renderTopHeader("STOCK WITHDRAWAL", "Withdrawal Details", {
    name: data.clientName || DEFAULTS.clientName,
    contact: data.clientContact || DEFAULTS.clientContact,
    address: data.clientAddress || DEFAULTS.clientAddress
  }, `{\\bfseries Prepared by:} ${escapeLatex(data.technician || DEFAULTS.technician)} \\
        {\\bfseries Customer:} ${escapeLatex(data.clientName || DEFAULTS.clientName)} \\
        {\\bfseries Record Type:} Stock Withdrawal / Issue Record`);

  return `${preamble}
${headerFields}
${top}

% Summary
\\begin{tcolorbox}[colback=white,colframe=paperline]
    {\\bfseries\\color{steel} Withdrawal Purpose / Notes}\\par
    \\vspace{1mm}
    ${latexParagraph(data.withdrawalPurpose, DEFAULTS.withdrawalPurpose)}
\\end{tcolorbox}

% Items table
\\rowcolors{2}{soft}{white}
\\begin{tabularx}{\\textwidth}{
    >{\\RaggedRight\\arraybackslash}p{1.2cm}
    >{\\RaggedRight\\arraybackslash}p{4.0cm}
    >{\\RaggedRight\\arraybackslash}p{3.3cm}
    >{\\RaggedRight\\arraybackslash}p{2.8cm}
    >{\\RaggedRight\\arraybackslash}X
}
\\rowcolor{ink}
{\\color{white}\\textbf{Qty}} &
{\\color{white}\\textbf{Item}} &
{\\color{white}\\textbf{Serial / Ref}} &
{\\color{white}\\textbf{Condition Out}} &
{\\color{white}\\textbf{Intended Use}} \\
\\midrule
${renderWithdrawalTableRows(assets)}
\\end{tabularx}

% Bottom row
\\begin{minipage}[t]{0.60\\textwidth}
    \\vspace{0pt}
    \\begin{tcolorbox}[colback=soft,colframe=paperline,before skip=0mm,after skip=0mm]
        {\\bfseries\\color{steel} Materials / Supporting Notes}\\par
        \\vspace{1mm}
        ${materialsBody}
    \\end{tcolorbox}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.36\\textwidth}
    \\vspace{0pt}
    \\begin{tcolorbox}[colback=softbronze,colframe=bronze,left=3.5mm,right=3.5mm,top=3mm,bottom=3mm,before skip=0mm,after skip=0mm]
        {\\bfseries\\color{steel} Withdrawal Status}\\par
        \\vspace{2mm}
        \\begin{tabularx}{\\linewidth}{@{}>{\\bfseries}X>{\\RaggedLeft\\arraybackslash}X@{}}
        Lines Logged & ${assets.length} \\
        Client & ${escapeLatex(data.clientName || DEFAULTS.clientName)} \\
        Status & ${escapeLatex(data.status || DEFAULTS.status)} \\
        \\end{tabularx}
    \\end{tcolorbox}
\\end{minipage}

\\vfill

{\\color{bronze}\\rule{\\textwidth}{0.8pt}}

\\vspace{2mm}

\\begin{center}
    {\\color{textgray}\\small Internal stock withdrawal record prepared for ${escapeLatex(data.clientName || DEFAULTS.clientName)}.}
\\end{center}

\\end{document}`;
}

function renderJobAssetBlock(asset, index) {
  const title = escapeLatex(asset.assetTitle?.trim() || `Line ${index + 1}`);
  const item = escapeLatex(asset.item?.trim() || "UNSPECIFIED ITEM");
  const serial = escapeLatex(serialDisplay(asset));
  const faultLines = linesToItems(asset.fault);
  const faultLabel = faultLines.length > 1 ? "Faults" : "Fault";
  const faultBody = faultLines.length <= 1 ? latexParagraph(asset.fault) : latexBullets(asset.fault);
  const workBody = latexBullets(asset.workPerformed);
  const notesBody = latexBullets(asset.notes);
  return `\\Needspace{0.34\\textheight}
\\begin{tcolorbox}[colback=white,colframe=paperline${index ? ",before skip=0mm" : ""}]
    {\\bfseries\\color{steel} ${title}}\\par
    \\vspace{2mm}

    \\begin{tabularx}{\\linewidth}{@{}>{\\bfseries}p{3.2cm}X@{}}
    \\FieldRow{Serial No.}{${serial}}
    \\FieldRow{Item}{${item}}
    \\FieldRow{Qty}{${escapeLatex(asset.quantity || "1")}}
    \\end{tabularx}

    \\SectionLabel{${faultLabel}}
    ${faultBody}

    \\SectionLabel{Work Performed}
    ${workBody}

    \\SectionLabel{Notes / Technical Observations}
    ${notesBody}
\\end{tcolorbox}`;
}

function renderJobCardLatex(data) {
  const assets = data.assets?.length ? data.assets : DEFAULTS.assets;
  const assetBlocks = assets.map(renderJobAssetBlock).join("\n\n");
  const materialsBody = latexBullets(data.materials, "No materials referenced.");
  const preamble = documentPreamble("JOB CARD", `Job Card \#${data.jobCardNumber || DEFAULTS.jobCardNumber}`);
  const headerFields = renderHeaderCommon("jobcard", data.jobCardNumber || DEFAULTS.jobCardNumber, data.issuedDate || DEFAULTS.issuedDate, "Completed", data.completionDate || DEFAULTS.completionDate, data.status || DEFAULTS.status, data.logoFile || DEFAULTS.logoFile);
  const top = renderTopHeader("JOB CARD", "Job Card Details", {
    name: data.clientName || DEFAULTS.clientName,
    contact: data.clientContact || DEFAULTS.clientContact,
    address: data.clientAddress || DEFAULTS.clientAddress
  }, `{\\bfseries Technician:} ${escapeLatex(data.technician || DEFAULTS.technician)} \\
        {\\bfseries Customer:} ${escapeLatex(data.clientName || DEFAULTS.clientName)} \\
        {\\bfseries Record Type:} Repair / Service Job Card`);

  return `${preamble}
${headerFields}
${top}

% Summary
\\begin{tcolorbox}[colback=white,colframe=paperline]
    {\\bfseries\\color{steel} Job Summary}\\par
    \\vspace{1mm}
    ${latexParagraph(data.jobSummary, DEFAULTS.jobSummary)}
\\end{tcolorbox}

${assetBlocks}

% Bottom row
\\begin{minipage}[t]{0.60\\textwidth}
    \\vspace{0pt}
    \\begin{tcolorbox}[colback=soft,colframe=paperline,before skip=0mm,after skip=0mm]
        {\\bfseries\\color{steel} Parts / Materials Referenced}\\par
        \\vspace{1mm}
        ${materialsBody}
    \\end{tcolorbox}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.36\\textwidth}
    \\vspace{0pt}
    \\begin{tcolorbox}[colback=softbronze,colframe=bronze,left=3.5mm,right=3.5mm,top=3mm,bottom=3mm,before skip=0mm,after skip=0mm]
        {\\bfseries\\color{steel} Record Status}\\par
        \\vspace{2mm}
        \\begin{tabularx}{\\linewidth}{@{}>{\\bfseries}X>{\\RaggedLeft\\arraybackslash}X@{}}
        Units Logged & ${assets.length} \\
        Client & ${escapeLatex(data.clientName || DEFAULTS.clientName)} \\
        Status & ${escapeLatex(data.status || DEFAULTS.status)} \\
        \\end{tabularx}
    \\end{tcolorbox}
\\end{minipage}

\\vfill

{\\color{bronze}\\rule{\\textwidth}{0.8pt}}

\\vspace{2mm}

\\begin{center}
    {\\color{textgray}\\small Internal service record prepared for ${escapeLatex(data.clientName || DEFAULTS.clientName)}.}
\\end{center}

\\end{document}`;
}

function buildInvoiceDescription(asset) {
  const parts = [];
  if (asset.fault?.trim()) parts.push(`Fault: ${asset.fault.trim().replace(/\n+/g, ' ')}`);
  if (asset.workPerformed?.trim()) parts.push(`Work: ${asset.workPerformed.trim().replace(/\n+/g, ' ')}`);
  if (asset.notes?.trim()) parts.push(`Notes: ${asset.notes.trim().replace(/\n+/g, ' ')}`);
  return escapeLatex(parts.join(' '));
}

function renderInvoiceRows(assets) {
  return assets.map((asset) => {
    const qty = moneyNumber(asset.quantity || 1);
    const amount = moneyNumber(asset.amount || 0);
    const lineTotal = qty * amount;
    return {
      latex: `${escapeLatex(String(qty || 1))} & ${escapeLatex(asset.item || 'UNSPECIFIED ITEM')} & ${escapeLatex(serialDisplay(asset))} & ${buildInvoiceDescription(asset)} & ${formatRand(lineTotal)} \\\n`,
      total: lineTotal
    };
  });
}

function renderInvoiceLatex(data) {
  const assets = data.assets?.length ? data.assets : DEFAULTS.assets;
  const rows = renderInvoiceRows(assets);
  const subtotal = rows.reduce((sum, row) => sum + row.total, 0);
  const footer = `Invoice \#${data.invoiceNumber || DEFAULTS.invoiceNumber}`;
  const preamble = documentPreamble("INVOICE", footer);
  const headerFields = renderHeaderCommon("invoice", data.invoiceNumber || DEFAULTS.invoiceNumber, data.issuedDate || DEFAULTS.issuedDate, "Due", data.dueDate || DEFAULTS.dueDate, data.status || DEFAULTS.status, data.logoFile || DEFAULTS.logoFile);
  const top = renderTopHeader("INVOICE", "Invoice Details", {
    name: data.clientName || DEFAULTS.clientName,
    contact: data.clientContact || DEFAULTS.clientContact,
    address: data.clientAddress || DEFAULTS.clientAddress
  }, `{\\bfseries Prepared by:} ${escapeLatex(data.technician || DEFAULTS.technician)} \\
        {\\bfseries Customer:} ${escapeLatex(data.clientName || DEFAULTS.clientName)} \\
        {\\bfseries Record Type:} Service Invoice`);
  const invoiceNotes = latexParagraph(data.invoiceNotes, DEFAULTS.invoiceNotes);

  return `${preamble}
${headerFields}
${top}

% Summary
\\begin{tcolorbox}[colback=white,colframe=paperline]
    {\\bfseries\\color{steel} Invoice Notes}\\par
    \\vspace{1mm}
    ${invoiceNotes}
\\end{tcolorbox}

% Items table
\\rowcolors{2}{soft}{white}
\\begin{tabularx}{\\textwidth}{
    >{\\RaggedRight\\arraybackslash}p{1.1cm}
    >{\\RaggedRight\\arraybackslash}p{3.2cm}
    >{\\RaggedRight\\arraybackslash}p{3.0cm}
    >{\\RaggedRight\\arraybackslash}X
    >{\\RaggedLeft\\arraybackslash}p{2.2cm}
}
\\rowcolor{ink}
{\\color{white}\\textbf{Qty}} &
{\\color{white}\\textbf{Item}} &
{\\color{white}\\textbf{Serial / Ref}} &
{\\color{white}\\textbf{Description}} &
{\\color{white}\\textbf{Amount}} \\
\\midrule
${rows.map(r => r.latex).join('\n')}
\\end{tabularx}

\\vspace{6mm}

\\begin{minipage}[t]{0.56\\textwidth}
    \\begin{tcolorbox}[colback=soft,colframe=paperline,before skip=0mm,after skip=0mm]
        {\\bfseries\\color{steel} Billing Note}\\par
        \\vspace{1mm}
        Payment for workshop service work and related parts / labour as listed above.
    \\end{tcolorbox}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.40\\textwidth}
    \\begin{tcolorbox}[colback=softbronze,colframe=bronze,left=4mm,right=4mm,top=3.5mm,bottom=3.5mm,before skip=0mm,after skip=0mm]
        \\begin{tabularx}{\\linewidth}{@{}Xr@{}}
        \\textbf{Subtotal} & \\textbf{${formatRand(subtotal)}} \\
        \\addlinespace[1.5mm]
        {\\Large\\bfseries Total} & {\\Large\\bfseries ${formatRand(subtotal)}} \\
        \\end{tabularx}
    \\end{tcolorbox}
\\end{minipage}

\\vfill

{\\color{bronze}\\rule{\\textwidth}{0.8pt}}

\\vspace{2mm}

\\begin{center}
    {\\color{textgray}\\small ${escapeLatex(data.invoiceNotes || DEFAULTS.invoiceNotes)}}
\\end{center}

\\end{document}`;
}
