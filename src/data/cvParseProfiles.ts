import type { CvParsePayload, FieldStatus, ProfileField, ProfileTagGroup, WorkExperienceEntry } from '../types'
import pdfEn from '../../data/cv-parse-fallback/pdf-en.json'
import docxEn from '../../data/cv-parse-fallback/docx-en.json'
import pdfScan from '../../data/cv-parse-fallback/pdf-scan.json'
import {
  emptyProfileFields,
  emptyProfileTagGroup,
  guardV1Certification,
  workHistoryWithIds,
} from './cvProfileSchema'

export interface CvParseFieldResult {
  key: string
  value?: string
  status: FieldStatus
  evidence?: string
  source: string
  confidence?: number
}

export interface CvParseProfileData extends CvParsePayload {
  label: string
  fileName: string
  isScannedPdf: boolean
}

type RawFallback = {
  fields: CvParseFieldResult[]
  skills: ProfileTagGroup
  languages: ProfileTagGroup
  workHistory: Array<Omit<WorkExperienceEntry, 'id'>>
}

const FALLBACK_RAW: Record<string, RawFallback> = {
  'pdf-en': pdfEn as RawFallback,
  'docx-en': docxEn as RawFallback,
  'pdf-scan': pdfScan as RawFallback,
}

function buildProfile(
  sampleId: string,
  meta: { label: string; fileName: string; isScannedPdf: boolean },
): CvParseProfileData {
  const raw = FALLBACK_RAW[sampleId]
  return { ...meta, ...applyCvParsePayload(sampleId, meta.fileName, raw) }
}

export const CV_PARSE_PROFILES: Record<string, CvParseProfileData> = {
  'pdf-en': buildProfile('pdf-en', {
    label: '01-sara-al-hinai-en.pdf',
    fileName: '01-sara-al-hinai-en.pdf',
    isScannedPdf: false,
  }),
  'docx-en': buildProfile('docx-en', {
    label: '02-khalid-al-balushi-en.docx',
    fileName: '02-khalid-al-balushi-en.docx',
    isScannedPdf: false,
  }),
  'pdf-scan': buildProfile('pdf-scan', {
    label: '04-noor-al-hashmi-scan.pdf',
    fileName: '04-noor-al-hashmi-scan.pdf',
    isScannedPdf: true,
  }),
}

export function resolveSampleProfileId(fileName: string): string | null {
  const normalized = fileName.toLowerCase()
  if (normalized.includes('noor') || normalized.includes('scan')) return 'pdf-scan'
  if (normalized.includes('khalid') || normalized.endsWith('.docx')) return 'docx-en'
  if (normalized.includes('sara') || normalized.includes('01-sara')) return 'pdf-en'
  return null
}

export function isKnownCvSampleId(sampleId: string): boolean {
  return sampleId in CV_PARSE_PROFILES
}

export function getCvParseProfile(sampleId: string): CvParseProfileData | undefined {
  return CV_PARSE_PROFILES[sampleId]
}

export function applyScalarParse(
  current: ProfileField[],
  parsed: CvParseFieldResult[],
): ProfileField[] {
  return current.map((field) => {
    const update = parsed.find((entry) => entry.key === field.key)
    if (!update) return field
    const confidence = update.confidence ? ` (OCR confidence ${update.confidence.toFixed(2)})` : ''
    return {
      ...field,
      value: update.value ?? field.value,
      status: update.status,
      evidence: update.evidence ?? field.evidence,
      source: `${update.source}${confidence}`,
    }
  })
}

export function applyCvParsePayload(
  sampleId: string,
  fileName: string,
  payload: {
    fields?: CvParseFieldResult[]
    skills?: ProfileTagGroup
    languages?: ProfileTagGroup
    workHistory?: Array<Omit<WorkExperienceEntry, 'id'> | WorkExperienceEntry>
  },
): CvParsePayload {
  const fields = syncCurrentRoleFromWorkHistory(
    guardV1Certification(
      applyScalarParse(emptyProfileFields(), payload.fields ?? []),
      sampleId,
      fileName,
    ),
    payload.workHistory ?? [],
  )
  return {
    fields,
    skills: payload.skills ?? emptyProfileTagGroup(),
    languages: payload.languages ?? emptyProfileTagGroup(),
    workHistory: workHistoryWithIds(payload.workHistory ?? []),
  }
}

/** Map Current role scalars from the most recent work-history entry when parse omitted them. */
function syncCurrentRoleFromWorkHistory(
  fields: ProfileField[],
  workHistory: Array<Omit<WorkExperienceEntry, 'id'> | WorkExperienceEntry>,
): ProfileField[] {
  const current = workHistory[0]
  if (!current) return fields

  const patch: Record<string, { value: string; status: FieldStatus; evidence: string; source: string }> = {}
  const company = fields.find((f) => f.key === 'companyName')
  const title = fields.find((f) => f.key === 'positionTitle')

  if (company && !company.value.trim() && current.company.trim()) {
    patch.companyName = {
      value: current.company,
      status: current.status ?? 'parsed',
      evidence: current.evidence || `${current.title} — ${current.company}`,
      source: current.source || 'Experience section',
    }
  }
  if (title && !title.value.trim() && current.title.trim()) {
    patch.positionTitle = {
      value: current.title,
      status: current.status ?? 'parsed',
      evidence: current.evidence || `${current.title} — ${current.company}`,
      source: current.source || 'Experience section',
    }
  }

  if (Object.keys(patch).length === 0) return fields
  return fields.map((field) => (patch[field.key] ? { ...field, ...patch[field.key] } : field))
}
