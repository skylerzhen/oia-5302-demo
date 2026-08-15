import type { McqQuestion } from '../types'

export const MCQ_QUESTIONS: McqQuestion[] = [
  {
    id: 'q1',
    prompt: 'Which metric best measures portfolio concentration risk?',
    promptAr: 'أي مقياس يقيس مخاطر تركز المحفظة بشكل أفضل؟',
    options: ['Herfindahl index', 'Current ratio', 'Gross margin', 'Working capital'],
    correctIndex: 0,
  },
  {
    id: 'q2',
    prompt: 'A quarterly variance report should primarily explain:',
    promptAr: 'يجب أن يشرح تقرير التباين ربع السنوي بشكل أساسي:',
    options: [
      'Changes vs prior forecast/benchmark',
      'Only total assets',
      'HR headcount only',
      'Office lease terms',
    ],
    correctIndex: 0,
  },
  {
    id: 'q3',
    prompt: 'When presenting to a bilingual board, the best practice is:',
    promptAr: 'عند العرض على مجلس ثنائي اللغة، أفضل ممارسة هي:',
    options: [
      'Consistent figures with aligned EN/AR narrative',
      'Arabic-only appendix hidden from auditors',
      'Remove all risk disclosures',
      'Use unaudited projections only',
    ],
    correctIndex: 0,
  },
  {
    id: 'q4',
    prompt: 'Excel models for financial forecasting should:',
    promptAr: 'يجب أن تكون نماذج Excel للتنبؤ المالي:',
    options: [
      'Separate inputs, calculations, and outputs with version control',
      'Hard-code all assumptions in one cell',
      'Disable audit trails',
      'Share editable files without locking assumptions',
    ],
    correctIndex: 0,
  },
]

export const INTERVIEW_PRESET = [
  {
    id: 'greet',
    language: 'en' as const,
    text: 'Welcome to OIA. Please describe a recent portfolio analysis you led and how you communicated risks to senior stakeholders.',
  },
  {
    id: 'followup-template',
    language: 'en' as const,
    text: 'You mentioned "{answer}". How did you quantify the risk impact in that situation?',
  },
  {
    id: 'arabic',
    language: 'ar' as const,
    text: 'بالعربية: كيف تتعامل مع الفروقات بين التوقعات والنتائج الفعلية في تقاريرك الربع سنوية؟',
  },
  {
    id: 'arabic-followup',
    language: 'ar' as const,
    text: 'شكراً. بناءً على إجابتكم، ما الإجراء الذي اتخذتموه عندما تجاوز التباين الحد المقبول؟',
  },
]
