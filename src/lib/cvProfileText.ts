import type { CandidateProfile, ProfileField } from '../types'

/** Build CV text for LLM matching from parsed C1 fields + optional seed profile. */
export function buildCvTextForMatching(
  fields: ProfileField[],
  seed?: Pick<CandidateProfile, 'name' | 'cvText' | 'skills' | 'education' | 'yearsExperience'>,
): string {
  const lines: string[] = []

  if (seed?.name) lines.push(`${seed.name} — candidate profile`)
  for (const field of fields) {
    if (!field.value.trim()) continue
    lines.push(`${field.label}: ${field.value.trim()}`)
    if (field.evidence.trim()) lines.push(`  Evidence: ${field.evidence.trim()}`)
  }

  if (seed?.cvText && lines.length <= 2) {
    lines.push('', seed.cvText)
  }

  if (seed?.skills?.length) {
    lines.push('', `Skills: ${seed.skills.join(', ')}`)
  }
  if (seed?.education) lines.push(`Education: ${seed.education}`)
  if (seed?.yearsExperience) lines.push(`Years of experience: ${seed.yearsExperience}`)

  return lines.join('\n').trim()
}
