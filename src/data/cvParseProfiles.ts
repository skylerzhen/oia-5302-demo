import type { FieldStatus } from '../types'

export interface CvParseFieldResult {
  key: string
  value?: string
  status: FieldStatus
  evidence?: string
  source: string
  confidence?: number
}

export interface CvParseProfile {
  label: string
  fileName: string
  isArabicScan: boolean
  fields: CvParseFieldResult[]
}

export const CV_PARSE_PROFILES: Record<string, CvParseProfile> = {
  'pdf-en': {
    label: '01-sara-al-hinai-en.pdf',
    fileName: '01-sara-al-hinai-en.pdf',
    isArabicScan: false,
    fields: [
      { key: 'name', value: 'Sara Al-Hinai', status: 'parsed', evidence: 'Sara Al-Hinai — Senior Financial Analyst', source: 'Electronic PDF, page 1 header' },
      { key: 'email', value: 'sara.alhinai@example.om', status: 'parsed', evidence: 'sara.alhinai@example.om', source: 'Contact block, page 1' },
      { key: 'experience', value: '7', status: 'parsed', evidence: 'seven years of portfolio analysis', source: 'Experience section, page 1' },
      { key: 'education', value: 'MSc Finance, Sultan Qaboos University', status: 'parsed', evidence: 'MSc Finance, Sultan Qaboos University', source: 'Education section, page 1', confidence: 0.98 },
      { key: 'certification', value: '', status: 'missing', evidence: '', source: 'No certification found in source document' },
    ],
  },
  'docx-en': {
    label: '02-khalid-al-balushi-en.docx',
    fileName: '02-khalid-al-balushi-en.docx',
    isArabicScan: false,
    fields: [
      { key: 'name', value: 'Sara Al-Hinai', status: 'parsed', evidence: 'Sara Al-Hinai', source: 'DOCX body, paragraph 1' },
      { key: 'email', value: 'sara.alhinai@example.om', status: 'parsed', evidence: 'sara.alhinai@example.om', source: 'DOCX contact line' },
      { key: 'experience', value: '7', status: 'parsed', evidence: '7 years experience in portfolio analysis', source: 'DOCX experience block' },
      { key: 'education', value: 'MSc Finance, Sultan Qaboos University', status: 'parsed', evidence: 'MSc Finance, Sultan Qaboos University', source: 'DOCX education block', confidence: 0.96 },
      { key: 'certification', value: '', status: 'missing', evidence: '', source: 'No certification found in source document' },
    ],
  },
  'pdf-ar-scan': {
    label: '04-noor-al-hashmi-ar-scan.pdf',
    fileName: '04-noor-al-hashmi-ar-scan.pdf',
    isArabicScan: true,
    fields: [
      { key: 'name', value: 'Sara Al-Hinai', status: 'parsed', evidence: 'سارة / Sara Al-Hinai', source: 'Scanned PDF, page 1 (OCR)' },
      { key: 'email', value: 'sara.alhinai@example.om', status: 'parsed', evidence: 'sara.alhinai@example.om', source: 'Scanned PDF, page 1 (OCR)' },
      { key: 'experience', value: '7', status: 'parsed', evidence: 'seven years', source: 'Scanned PDF, page 1 (OCR)' },
      { key: 'education', value: 'MSc Finance, Sultan Qaboos University', status: 'review', evidence: 'MSc Finance, Sultan Qaboos University', source: 'Arabic scanned PDF, page 1', confidence: 0.82 },
      { key: 'certification', value: '', status: 'missing', evidence: '', source: 'Not found in scanned document' },
    ],
  },
}

export function resolveSampleProfileId(fileName: string): string | null {
  const normalized = fileName.toLowerCase()
  if (normalized.includes('noor') || normalized.includes('ar-scan') || normalized.includes('scan')) return 'pdf-ar-scan'
  if (normalized.endsWith('.docx')) return 'docx-en'
  if (normalized.includes('sara') || normalized.endsWith('.pdf')) return 'pdf-en'
  return null
}

export function getCvParseProfile(sampleId: string): CvParseProfile | undefined {
  return CV_PARSE_PROFILES[sampleId]
}
