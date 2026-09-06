export const CANDIDATE_STEPS = [
  { id: 'C1', label: 'Application', hint: 'Upload CV and confirm profile' },
  { id: 'C2', label: 'Profile review', hint: 'Confirm extracted details' },
  { id: 'C3', label: 'Technical assessment', hint: 'Role competency exam' },
  { id: 'C4', label: 'AI interview', hint: 'Live avatar session' },
  { id: 'C5', label: 'Match insights', hint: 'Score breakdown and tips' },
  { id: 'C6', label: 'Application status', hint: 'Outcome and next steps' },
] as const

export const HR_STEPS = [
  { id: 'H1', label: 'Review queues', hint: 'Rank pool and interview setup' },
  { id: 'H2', label: 'Screening decision', hint: 'Shortlist or decline with reason' },
  { id: 'H3', label: 'Interview review', hint: 'Recording and evaluation' },
  { id: 'H4', label: 'Final decision', hint: 'Weighted composite and hire/reject' },
  { id: 'H5', label: 'Audit and export', hint: 'Trail and compliance wrap-up' },
] as const

export function exportMatchesCsv(rows: Array<{ name: string; score: number; qualified: string }>): string {
  const header = 'Name,Match Score,Qualified'
  const body = rows.map((r) => `${r.name},${r.score},${r.qualified}`).join('\n')
  return `${header}\n${body}`
}
