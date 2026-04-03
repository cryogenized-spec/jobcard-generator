const BUSINESS = {
  name: "Vanguard Blade \\& Bolt",
  issuedBy: "Gareth Van Tonder",
  address: "52 Townview Road, Lot 14, Glenhills",
  email: "Cryogenized@gmail.com"
};

const DEFAULTS = {
  logoFile: "logo-square.png",
  jobCardNumber: "NS-JC-2026-002",
  jobCardDate: "02.04.2026",
  completionDate: "02.04.2026",
  clientName: "NeonSales",
  clientContact: "0328800863",
  clientAddress: "19 Mahatma Ghandi Street, KwaDukuza, KwaZulu-Natal, South Africa",
  technician: "Gareth Van Tonder",
  jobStatus: "Completed",
  jobSummary:
    "Service and repair work completed on workshop items recorded below, with notes captured per serialized or unserialized unit as applicable.",
  materials: [
    "O-ring AS568-015 U-90 (failed original type)",
    "Buna-N replacement O-ring from workshop spares"
  ],
  assets: [
    {
      assetTitle: "Asset 1",
      serialized: "yes",
      serial: "S6MR0115000178",
      item: "SPYDER MR-6 .68 CAL MARKER",
      fault: "Leaking. O-ring AS568-015 U-90 disintegration. Likely cause: hydrolysis.",
      workPerformed:
        "Failed seal replaced with a Buna-N O-ring from the spares bag. Replacement selected as a superior option for chemical resistance in static positions.",
      notes:
        "Marker fitted with a stiff upgraded hammer spring.\nEKO valve pin is the broad-stem upgraded variant."
    },
    {
      assetTitle: "Asset 2",
      serialized: "yes",
      serial: "S6MR0115001357",
      item: "SPYDER MR-6 .68 CAL MARKER",
      fault:
        "Charging handle spring slipped through the backstop.\nLeak issue identical to Asset 1: O-ring AS568-015 U-90 disintegration, likely caused by hydrolysis.",
      workPerformed:
        "Charging handle spring corrected by straightening the crooked end, reversing it in the groove, and reinstalling it with the charging handle.\nCharging handle now resets to position after release as normal.\nLeak rectified using an AS568-015 equivalent O-ring.",
      notes:
        "Marker came packaged with a SPYDER VICTOR spares kit.\nO-rings are dimensionally compatible, so the included spare was used as required.\nMarker is otherwise in brand new condition."
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
    .map(line => line.trim())
    .filter(Boolean);
}

function latexBullets(text = "") {
  const lines = linesToItems(text);
  if (!lines.length) return "\\begin{itemize}\n        \\item None recorded.\n    \\end{itemize}";
  return [
    "\\begin{itemize}",
    ...lines.map(line => `        \\item ${escapeLatex(line)}`),
    "    \\end{itemize}"
  ].join("\n");
}

function renderFaultSection(text = "") {
  const lines = linesToItems(text);
  if (lines.length <= 1) return escapeLatex(lines[0] || "No fault recorded.");
  return latexBullets(text);
}

function renderAssetBlock(asset, index) {
  const title = escapeLatex(asset.assetTitle?.trim() || `Asset ${index + 1}`);
  const item = escapeLatex(asset.item?.trim() || "UNSPECIFIED ITEM");
  const serialValue = asset.serialized === "no"
    ? "N/A (unserialized item)"
    : (asset.serial?.trim() || "N/A");
  const serial = escapeLatex(serialValue);
  const faultBody = renderFaultSection(asset.fault);
  const workBody = latexBullets(asset.workPerformed);
  const notesBody = latexBullets(asset.notes);

  const faultLabel = linesToItems(asset.fault).length > 1 ? "Faults" : "Fault";

  return `
\\Needspace{0.34\\textheight}
\\begin{tcolorbox}[colback=white,colframe=paperline${index === 0 ? "" : ",before skip=0mm"}]
    {\\bfseries\\color{steel} ${title}}\\par
    \\vspace{2mm}

    \\begin{tabularx}{\\linewidth}{@{}>{\\bfseries}p{3.2cm}X@{}}
    \\FieldRow{Serial No.}{${serial}}
    \\FieldRow{Item}{${item}}
    \\end{tabularx}

    \\SectionLabel{${faultLabel}}
    ${faultBody}

    \\SectionLabel{Work Performed}
    ${workBody}

    \\SectionLabel{Notes / Technical Observations}
    ${notesBody}
\\end{tcolorbox}`.trim();
}

function renderJobCardLatex(data) {
  const assets = data.assets.length ? data.assets : [DEFAULTS.assets[0]];
  const assetBlocks = assets.map((asset, index) => renderAssetBlock(asset, index)).join("\\n\\n");
  const summary = escapeLatex(data.jobSummary?.trim() || DEFAULTS.jobSummary);
  const footerJobNo = escapeLatex(data.jobCardNumber || DEFAULTS.jobCardNumber);
  const materialsBody = latexBullets(data.materials);

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
\fancyfoot[L]{\color{textgray}\small ${BUSINESS.name}}
\fancyfoot[R]{\color{textgray}\small Job Card \#${footerJobNo}}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

% ---------------------------
% Editable fields
% ---------------------------
\newcommand{\BusinessName}{${BUSINESS.name}}
\newcommand{\IssuedBy}{${escapeLatex(BUSINESS.issuedBy)}}
\newcommand{\BusinessAddress}{${escapeLatex(BUSINESS.address)}}
\newcommand{\BusinessEmail}{${escapeLatex(BUSINESS.email)}}

\newcommand{\LogoFile}{${escapeLatex(data.logoFile || DEFAULTS.logoFile)}}

\newcommand{\JobCardNumber}{${escapeLatex(data.jobCardNumber || DEFAULTS.jobCardNumber)}}
\newcommand{\JobCardDate}{${escapeLatex(data.jobCardDate || DEFAULTS.jobCardDate)}}
\newcommand{\CompletionDate}{${escapeLatex(data.completionDate || DEFAULTS.completionDate)}}
\newcommand{\ClientName}{${escapeLatex(data.clientName || DEFAULTS.clientName)}}
\newcommand{\ClientContact}{${escapeLatex(data.clientContact || DEFAULTS.clientContact)}}
\newcommand{\ClientAddress}{${escapeLatex(data.clientAddress || DEFAULTS.clientAddress)}}
\newcommand{\Technician}{${escapeLatex(data.technician || DEFAULTS.technician)}}
\newcommand{\JobStatus}{${escapeLatex(data.jobStatus || DEFAULTS.jobStatus)}}

% ---------------------------
% Logo block
% ---------------------------
\newcommand{\LogoBlock}{
\IfFileExists{\LogoFile}{
    \includegraphics[width=4.0cm,height=4.0cm,keepaspectratio]{\LogoFile}
}{
    \begin{tikzpicture}
        \draw[line width=0.8pt, color=bronze] (0,0) rectangle (4,4);
        \draw[line width=0.5pt, color=bronze] (0.2,0.2) rectangle (3.8,3.8);
        \node[align=center,text=steel,font=\bfseries] at (2,2.25) {LOGO};
        \node[align=center,text=textgray,font=\scriptsize] at (2,1.45) {1:1 placeholder};
        \node[align=center,text=textgray,font=\scriptsize] at (2,0.8) {\texttt{\LogoFile}};
    \end{tikzpicture}
}
}

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

\begin{document}

% Top bar
\begin{tcolorbox}[colback=ink,colframe=ink,boxrule=0pt,left=5mm,right=5mm,top=3mm,bottom=3mm,before skip=0mm]
    {\color{white}\Large\bfseries JOB CARD}
\end{tcolorbox}

% Header
\begin{minipage}[t]{0.20\textwidth}
    \LogoBlock
\end{minipage}
\hfill
\begin{minipage}[t]{0.42\textwidth}
    \vspace*{10mm}
    {\raggedright\LARGE\bfseries\color{steel} \BusinessName\par}
    \vspace{1.5mm}
    {\color{bronze}\rule{\linewidth}{0.9pt}} \\[2mm]
    {\bfseries Issued by:} \IssuedBy \\
    \BusinessAddress \\
    \texttt{\BusinessEmail}
\end{minipage}
\hfill
\begin{minipage}[t]{0.34\textwidth}
    \vspace*{6mm}
    \begin{tcolorbox}[
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
        width=\linewidth
    ]
        {\color{steel}\normalsize\bfseries Job Card Details}\par
        \vspace{2.5mm}

        \small
        \renewcommand{\arraystretch}{1.22}
        \begin{tabularx}{\linewidth}{@{}p{20mm}>{\raggedright\arraybackslash}X@{}}
        \textbf{No.}       & \JobCardNumber \\
        \textbf{Issued}    & \JobCardDate \\
        \textbf{Completed} & \CompletionDate \\
        \textbf{Status}    & \JobStatus \\
        \end{tabularx}
    \end{tcolorbox}
\end{minipage}

% Client / Technician
\begin{minipage}[t]{0.58\textwidth}
    \vspace{0pt}
    \begin{tcolorbox}[colback=soft,colframe=paperline]
        {\bfseries\color{steel} Client}\par
        \vspace{1mm}
        \ClientName \\
        \ClientContact \\
        \ClientAddress
    \end{tcolorbox}
\end{minipage}
\hfill
\begin{minipage}[t]{0.38\textwidth}
    \vspace{0pt}
    \begin{tcolorbox}[colback=soft,colframe=paperline]
        {\bfseries\color{steel} Technician / Reference}\par
        \vspace{1mm}
        {\bfseries Technician:} \Technician \\
        {\bfseries Customer:} \ClientName \\
        {\bfseries Record Type:} Repair / Service Job Card
    \end{tcolorbox}
\end{minipage}

% Summary
\begin{tcolorbox}[colback=white,colframe=paperline]
    {\bfseries\color{steel} Job Summary}\par
    \vspace{1mm}
    ${summary}
\end{tcolorbox}

${assetBlocks}

% Bottom row
\begin{minipage}[t]{0.60\textwidth}
    \vspace{0pt}
    \begin{tcolorbox}[colback=soft,colframe=paperline,before skip=0mm,after skip=0mm]
        {\bfseries\color{steel} Parts / Materials Referenced}\par
        \vspace{1mm}
        ${materialsBody}
    \end{tcolorbox}
\end{minipage}
\hfill
\begin{minipage}[t]{0.36\textwidth}
    \vspace{0pt}
    \begin{tcolorbox}[colback=softbronze,colframe=bronze,left=3.5mm,right=3.5mm,top=3mm,bottom=3mm,before skip=0mm,after skip=0mm]
        {\bfseries\color{steel} Record Status}\par
        \vspace{2mm}
        \begin{tabularx}{\linewidth}{@{}>{\bfseries}X>{\RaggedLeft\arraybackslash}X@{}}
        Units Logged & ${assets.length} \\
        Client & \ClientName \\
        Status & \JobStatus \\
        \end{tabularx}
    \end{tcolorbox}
\end{minipage}

\vfill

{\color{bronze}\rule{\textwidth}{0.8pt}}

\vspace{2mm}

\begin{center}
    {\color{textgray}\small Internal service record prepared for \ClientName.}
\end{center}

\end{document}
`;
}
