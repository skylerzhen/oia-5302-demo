import type { McqQuestion } from '../types'

export const MCQ_QUESTIONS: McqQuestion[] = [
  {
    id: 'q1',
    prompt: 'Which metric best measures portfolio concentration risk?',
    options: ['Herfindahl index', 'Current ratio', 'Gross margin', 'Working capital'],
    correctIndex: 0,
  },
  {
    id: 'q2',
    prompt: 'A quarterly variance report should primarily explain:',
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
    prompt: 'When presenting to the investment committee, the best practice is:',
    options: [
      'Consistent figures with a clear executive narrative',
      'Appendix-only detail hidden from auditors',
      'Remove all risk disclosures',
      'Use unaudited projections only',
    ],
    correctIndex: 0,
  },
  {
    id: 'q4',
    prompt: 'Excel models for financial forecasting should:',
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
]
