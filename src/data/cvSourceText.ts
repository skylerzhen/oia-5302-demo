/** Bundled CV plain-text for demo samples — sent to LLM when Surge has no PDF/DOCX. */
export const CV_SOURCE_TEXT: Record<string, string> = {
  'pdf-en': `# Sara Al-Hinai

Email: sara.alhinai@example.om
Location: Muscat, Oman

Senior financial analyst with seven years of portfolio analysis, risk reporting
and stakeholder board communication experience.

Experience:
- Led quarterly portfolio variance analysis for multi-asset mandates.
- Presented the risk impact and recommended action to senior stakeholders.
- Prepared board reporting packs with controlled figures.
- Maintained Excel forecasting models with documented assumptions.

Education: MSc Finance, Sultan Qaboos University
Skills: Portfolio analysis, Risk reporting, Excel modelling, English`,

  'docx-en': `# Khalid Al-Balushi (demo DOCX path maps to Sara profile in C1)

Email: sara.alhinai@example.om
Seven years experience in portfolio analysis and risk reporting.
Education: MSc Finance, Sultan Qaboos University
Skills: Financial reporting, Excel`,

  'pdf-scan': `# Noor Al-Hashmi — scanned PDF OCR demo

Email: n.hashmi@example.om
Six years risk reporting in banking sector.
Education: MSc Economics (OCR confidence below threshold — review required)
Skills: Risk reporting, Excel modelling, English`,
}

export function cvSourceTextForSample(sampleId: string): string | undefined {
  return CV_SOURCE_TEXT[sampleId]
}
