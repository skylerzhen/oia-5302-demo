import type { ProfileField, ProfileTagGroup, WorkExperienceEntry } from '../types'

export const CV_SCALAR_FIELD_DEFS: Array<Pick<ProfileField, 'key' | 'label'>> = [
  { key: 'name', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'address', label: 'Address' },
  { key: 'experience', label: 'Years of experience' },
  { key: 'educationLevel', label: 'Education level' },
  { key: 'university', label: 'College / University' },
  { key: 'gpa', label: 'GPA' },
  { key: 'graduationDate', label: 'Graduation date' },
  { key: 'specialization', label: 'Specialization / Discipline' },
  { key: 'companyName', label: 'Company name' },
  { key: 'positionTitle', label: 'Position title' },
  { key: 'industry', label: 'Industry' },
  { key: 'location', label: 'Location' },
  { key: 'certification', label: 'Professional certification' },
]

export const CV_SCALAR_KEYS = CV_SCALAR_FIELD_DEFS.map((f) => f.key)

export const PROFILE_UI_SECTIONS = [
  {
    id: 'profile',
    title: 'Profile',
    keys: ['name', 'email', 'phone', 'nationality', 'address', 'experience'],
  },
  {
    id: 'education',
    title: 'Education',
    keys: ['educationLevel', 'university', 'gpa', 'graduationDate', 'specialization'],
  },
  {
    id: 'career',
    title: 'Current role',
    keys: ['companyName', 'positionTitle', 'industry', 'location'],
  },
  {
    id: 'certification',
    title: 'Certification',
    keys: ['certification'],
  },
] as const

export function emptyProfileFields(): ProfileField[] {
  return CV_SCALAR_FIELD_DEFS.map((field) => ({
    ...field,
    value: '',
    status: 'missing',
    evidence: '',
    source: '',
  }))
}

export function emptyProfileTagGroup(): ProfileTagGroup {
  return { items: [], status: 'missing', evidence: '', source: '' }
}

export function emptyWorkHistory(): WorkExperienceEntry[] {
  return []
}

export function mergeProfileFields(existing: ProfileField[]): ProfileField[] {
  const template = emptyProfileFields()
  return template.map((t) => {
    const match = existing.find((f) => f.key === t.key)
    return match ? { ...t, ...match, label: t.label } : t
  })
}

export function workHistoryWithIds(
  entries: Array<Omit<WorkExperienceEntry, 'id'>>,
): WorkExperienceEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    id: `wh-${index}-${entry.company.slice(0, 12) || 'role'}`,
  }))
}

export function isV1SaraSample(sampleId?: string, fileName?: string) {
  const id = sampleId ?? ''
  const name = (fileName ?? '').toLowerCase()
  return id === 'pdf-en' || name.includes('01-sara') || name.includes('sara-al-hinai')
}

/** Strip v2-only certification if it leaked into v1 parse output. */
export function guardV1Certification(
  fields: ProfileField[],
  sampleId?: string,
  fileName?: string,
): ProfileField[] {
  if (!isV1SaraSample(sampleId, fileName)) return fields
  return fields.map((field) => {
    if (field.key !== 'certification') return field
    if (!field.value.trim() || /cfa/i.test(field.value)) {
      return { ...field, value: '', status: 'missing', evidence: '', source: 'Not found in source document' }
    }
    return field
  })
}
