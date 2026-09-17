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
  if (normalized.includes('khalid') || normalized.includes('02-khalid')) return 'docx-en'
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
function pickCurrentWorkEntry(
  workHistory: Array<Omit<WorkExperienceEntry, 'id'> | WorkExperienceEntry>,
) {
  if (workHistory.length === 0) return undefined
  const present = workHistory.find((entry) => /present|current/i.test(entry.end) || !entry.end.trim())
  return present ?? workHistory[0]
}

function workHistoryBlob(
  entry: Omit<WorkExperienceEntry, 'id'> | WorkExperienceEntry,
) {
  return [
    entry.evidence,
    entry.source,
    entry.industry,
    entry.location,
    ...(entry.responsibilities ?? []),
  ].filter(Boolean).join(' · ')
}

function inferIndustry(
  entry: Omit<WorkExperienceEntry, 'id'> | WorkExperienceEntry,
) {
  if (entry.industry?.trim()) return entry.industry.trim()
  const match = workHistoryBlob(entry).match(/Industry:\s*([^·\n|]+)/i)
  return match?.[1]?.trim() ?? ''
}

function inferLocation(
  entry: Omit<WorkExperienceEntry, 'id'> | WorkExperienceEntry,
  fields: ProfileField[],
) {
  if (entry.location?.trim()) return entry.location.trim()
  const blob = workHistoryBlob(entry)
  const match = blob.match(
    /\b(Muscat(?:\s*,\s*Oman)?|Salalah|Sohar|Dubai|Abu Dhabi|Riyadh|Doha|London|UAE|Oman)\b/i,
  )
  if (match?.[0]) return match[0]
  const address = fields.find((f) => f.key === 'address')?.value.trim()
  return address ?? ''
}

function isUnfilledRoleValue(field: ProfileField | undefined) {
  if (!field) return true
  const value = String(field.value ?? '').trim()
  return field.status === 'missing' || !value || /^(missing|n\/a|na|-|—|none)$/i.test(value)
}

function projectMissingField(
  field: ProfileField | undefined,
  value: string,
  entry: Omit<WorkExperienceEntry, 'id'> | WorkExperienceEntry,
): { value: string; status: FieldStatus; evidence: string; source: string } | null {
  if (!value.trim() || !isUnfilledRoleValue(field)) return null
  return {
    value,
    status: entry.status ?? 'parsed',
    evidence: entry.evidence || `${entry.title} — ${entry.company}`,
    source: entry.source || 'Experience section',
  }
}

function syncCurrentRoleFromWorkHistory(
  fields: ProfileField[],
  workHistory: Array<Omit<WorkExperienceEntry, 'id'> | WorkExperienceEntry>,
): ProfileField[] {
  const current = pickCurrentWorkEntry(workHistory)
  if (!current) return fields

  const patch: Record<string, { value: string; status: FieldStatus; evidence: string; source: string }> = {}
  const company = projectMissingField(fields.find((f) => f.key === 'companyName'), current.company, current)
  const title = projectMissingField(fields.find((f) => f.key === 'positionTitle'), current.title, current)
  const industry = projectMissingField(fields.find((f) => f.key === 'industry'), inferIndustry(current), current)
  const location = projectMissingField(fields.find((f) => f.key === 'location'), inferLocation(current, fields), current)

  if (company) patch.companyName = company
  if (title) patch.positionTitle = title
  if (industry) patch.industry = industry
  if (location) patch.location = location

  if (Object.keys(patch).length === 0) return fields
  return fields.map((field) => (patch[field.key] ? { ...field, ...patch[field.key] } : field))
}
