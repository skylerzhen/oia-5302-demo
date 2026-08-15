export const CANDIDATE_STEPS = [
  { id: 'C1', label: 'Apply & parse CV', labelAr: 'التقديم وتحليل السيرة' },
  { id: 'C2', label: 'CV update confirm', labelAr: 'تأكيد تحديث السيرة' },
  { id: 'C3', label: 'Assessment exam', labelAr: 'الاختبار' },
  { id: 'C4', label: 'AI avatar interview', labelAr: 'المقابلة' },
  { id: 'C5', label: 'My score & tips', labelAr: 'نتيجتي وتوصياتي' },
  { id: 'C6', label: 'Application status', labelAr: 'حالة الطلب' },
] as const

export const HR_STEPS = [
  { id: 'H1', label: 'Matching dashboard', labelAr: 'لوحة المطابقة' },
  { id: 'H2', label: 'Shortlist / reject', labelAr: 'الترشيح / الاستبعاد' },
  { id: 'H3', label: 'Review interview', labelAr: 'مراجعة المقابلة' },
  { id: 'H4', label: 'Final decision', labelAr: 'القرار النهائي' },
  { id: 'H5', label: 'Audit & reports', labelAr: 'السجل والتقارير' },
] as const

export function exportMatchesCsv(rows: Array<{ name: string; score: number; qualified: string }>): string {
  const header = 'Name,Match Score,Qualified'
  const body = rows.map((r) => `${r.name},${r.score},${r.qualified}`).join('\n')
  return `${header}\n${body}`
}
