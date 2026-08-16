export const CANDIDATE_STEPS = [
  { id: 'C1', label: 'Apply & parse CV' },
  { id: 'C2', label: 'CV update confirm' },
  { id: 'C3', label: 'Assessment exam' },
  { id: 'C4', label: 'AI avatar interview' },
  { id: 'C5', label: 'My score & tips' },
  { id: 'C6', label: 'Application status' },
] as const

export const HR_STEPS = [
  { id: 'H1', label: 'Matching dashboard' },
  { id: 'H2', label: 'Shortlist / reject' },
  { id: 'H3', label: 'Review interview' },
  { id: 'H4', label: 'Final decision' },
  { id: 'H5', label: 'Demo complete' },
] as const

export function exportMatchesCsv(rows: Array<{ name: string; score: number; qualified: string }>): string {
  const header = 'Name,Match Score,Qualified'
  const body = rows.map((r) => `${r.name},${r.score},${r.qualified}`).join('\n')
  return `${header}\n${body}`
}
