/** Bundled CV plain-text for demo samples — keep in sync with cv-source/*.md */
export const CV_SOURCE_TEXT: Record<string, string> = {
  'pdf-en': `# Sara Al-Hinai

Email: sara.alhinai@example.om
Phone: +968 9123 4567
Nationality: Omani
Location: Muscat, Oman

Senior financial analyst with seven years of portfolio analysis, risk reporting
and bilingual board communication experience in sovereign wealth and asset management.

Experience:
Senior Financial Analyst — Gulf Sovereign Investment Services
Industry: Sovereign wealth & investment services · Muscat, Oman
2021–Present
- Led quarterly portfolio variance analysis for multi-asset mandates.
- Isolated duration, sector-allocation and liquidity drivers; presented risk impact to senior stakeholders.
- Prepared Arabic and English board reporting packs with controlled figures.
- Maintained Excel forecasting models with documented assumptions and version control.

Financial Analyst — Oman Capital Advisory
Industry: Investment advisory · Muscat, Oman
2018–2021
- Prepared investment-performance and exposure reports.
- Reconciled forecast changes against portfolio benchmarks.

Education:
MSc Finance · Sultan Qaboos University
GPA: 3.72/4.0 · Graduation: June 2017 · Specialization: Finance

Skills: Portfolio analysis · Risk reporting · Excel modelling · Variance analysis · Arabic · English`,

  'docx-en': `# Khalid Al-Balushi

Email: k.albalushi@example.om
Location: Muscat, Oman

Financial reporting analyst with five years of accounting, management reporting
and Excel experience. Limited direct portfolio-analysis exposure.

Experience:
Financial Reporting Analyst — Oman Infrastructure Holdings
2020–Present
- Produced monthly management packs and variance commentary.
- Maintained Excel reporting templates and reconciliations.
- Coordinated Arabic financial-report translation with the communications team.

Junior Accountant — Muscat Commercial Services
2018–2020
- Supported account reconciliations and budget reporting.

Education:
BSc Accounting

Skills: Financial reporting · Excel · Arabic · Management reporting`,

  'pdf-scan': `# Noor Al-Hashmi — scanned PDF OCR demo

Email: n.hashmi@example.om
Six years risk reporting in banking sector.
Education: MSc Economics (OCR confidence below threshold — review required)
Skills: Risk reporting, Excel modelling, English`,
}

export function cvSourceTextForSample(sampleId: string): string | undefined {
  return CV_SOURCE_TEXT[sampleId]
}
