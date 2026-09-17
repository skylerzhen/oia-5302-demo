import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SCALAR_KEYS = [
  'name', 'email', 'phone', 'nationality', 'address', 'experience',
  'educationLevel', 'university', 'gpa', 'graduationDate', 'specialization',
  'companyName', 'positionTitle', 'industry', 'location', 'certification',
]

const SCALAR_LABELS = {
  name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  nationality: 'Nationality',
  address: 'Address',
  experience: 'Years of experience',
  educationLevel: 'Education level',
  university: 'College / University',
  gpa: 'GPA',
  graduationDate: 'Graduation date',
  specialization: 'Specialization / Discipline',
  companyName: 'Company name',
  positionTitle: 'Position title',
  industry: 'Industry',
  location: 'Location',
  certification: 'Professional certification',
}

function isV1Sara(body = {}) {
  const sampleId = String(body.sampleId ?? '')
  const fileName = String(body.fileName ?? '').toLowerCase()
  return sampleId === 'pdf-en' || fileName.includes('01-sara') || fileName.includes('sara-al-hinai')
}

function normalizeStatus(status, value) {
  if (status === 'parsed' || status === 'review' || status === 'missing') return status
  return value ? 'parsed' : 'missing'
}

function normalizeScalarFields(rawFields = []) {
  const fields = Array.isArray(rawFields) ? rawFields : []
  return SCALAR_KEYS.map((key) => {
    const entry = fields.find((field) => field.key === key) ?? {}
    const value = typeof entry.value === 'string' ? entry.value.trim() : ''
    let status = normalizeStatus(entry.status, value)
    if (!value) status = 'missing'
    return {
      key,
      label: SCALAR_LABELS[key],
      value: status === 'missing' ? '' : value,
      status,
      confidence: typeof entry.confidence === 'number' ? entry.confidence : undefined,
      evidence: typeof entry.evidence === 'string' ? entry.evidence : (value || ''),
      source: typeof entry.source === 'string' ? entry.source : 'LLM extraction',
    }
  })
}

function normalizeTagGroup(raw, fallbackLabel) {
  const items = Array.isArray(raw?.items)
    ? raw.items.map((item) => String(item).trim()).filter(Boolean)
    : typeof raw?.value === 'string'
      ? raw.value.split(/[,;·|]/).map((s) => s.trim()).filter(Boolean)
      : []
  const status = normalizeStatus(raw?.status, items.length > 0)
  return {
    items: status === 'missing' ? [] : items,
    status: items.length ? status : 'missing',
    evidence: typeof raw?.evidence === 'string' ? raw.evidence : '',
    source: typeof raw?.source === 'string' ? raw.source : fallbackLabel,
  }
}

function normalizeWorkHistory(rawEntries = []) {
  const entries = Array.isArray(rawEntries) ? rawEntries : []
  return entries.map((entry, index) => {
    const company = String(entry.company ?? '').trim()
    const title = String(entry.title ?? entry.position ?? '').trim()
    const start = String(entry.start ?? '').trim()
    const end = String(entry.end ?? '').trim()
    const industry = String(entry.industry ?? '').trim()
    const location = String(entry.location ?? '').trim()
    const responsibilities = Array.isArray(entry.responsibilities)
      ? entry.responsibilities.map((r) => String(r).trim()).filter(Boolean)
      : []
    const hasContent = Boolean(company || title || start || end || responsibilities.length)
    const status = normalizeStatus(entry.status, hasContent)
    return {
      id: `wh-${index}-${company.slice(0, 12) || 'role'}`,
      company,
      title,
      start,
      end,
      industry,
      location,
      responsibilities,
      status: hasContent ? status : 'missing',
      evidence: typeof entry.evidence === 'string' ? entry.evidence : '',
      source: typeof entry.source === 'string' ? entry.source : 'Experience section',
    }
  }).filter((entry) => entry.status !== 'missing' || entry.company || entry.title)
}

function workHistoryBlob(entry) {
  return [entry.evidence, entry.source, entry.industry, entry.location, ...(entry.responsibilities ?? [])]
    .filter(Boolean)
    .join(' · ')
}

function syncCurrentRoleFromWorkHistory(fields, workHistory) {
  const current = workHistory.find((entry) => /present|current/i.test(entry.end) || !entry.end) ?? workHistory[0]
  if (!current) return fields

  const blob = workHistoryBlob(current)
  const industry = current.industry || blob.match(/Industry:\s*([^·\n|]+)/i)?.[1]?.trim() || ''
  const location = current.location
    || blob.match(/\b(Muscat(?:\s*,\s*Oman)?|Salalah|Sohar|Dubai|Abu Dhabi|Riyadh|Doha|London|UAE|Oman)\b/i)?.[0]
    || fields.find((f) => f.key === 'address')?.value
    || ''

  const patch = {
    companyName: current.company,
    positionTitle: current.title,
    industry,
    location,
  }

  return fields.map((field) => {
    const nextValue = patch[field.key]
    if (!nextValue || field.value) return field
    return {
      ...field,
      value: nextValue,
      status: current.status ?? 'parsed',
      evidence: current.evidence || `${current.title} — ${current.company}`,
      source: current.source || 'Experience section',
    }
  })
}

function guardV1Certification(fields, body) {
  if (!isV1Sara(body)) return fields
  return fields.map((field) => {
    if (field.key !== 'certification') return field
    if (!field.value || /cfa/i.test(field.value)) {
      return {
        ...field,
        value: '',
        status: 'missing',
        evidence: '',
        source: 'Not found in source document',
      }
    }
    return field
  })
}

export function normalizeCvParse(raw = {}, body = {}) {
  const workHistory = normalizeWorkHistory(raw.workHistory)
  const fields = syncCurrentRoleFromWorkHistory(
    guardV1Certification(normalizeScalarFields(raw.fields), body),
    workHistory,
  )
  return {
    fields,
    skills: normalizeTagGroup(raw.skills, 'Skills section'),
    languages: normalizeTagGroup(raw.languages, 'Languages section'),
    workHistory,
  }
}

/** Adapter fallback when LLM unavailable — reads bundled profile JSON. */
export function loadFallbackCvParse(sampleId) {
  const path = resolve(process.cwd(), 'data/cv-parse-fallback', `${sampleId}.json`)
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw)
}

export { SCALAR_KEYS, isV1Sara }
