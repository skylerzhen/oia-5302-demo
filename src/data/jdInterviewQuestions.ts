import { FINANCE_JOB } from './job'
import type { InterviewQuestion } from '../types'

/** Governed JD-linked interview question set (distinct from S5 MCQ bank). */
export const JD_INTERVIEW_QUESTION_SET_ID = 'senior-financial-analyst-v1'

export const JD_INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'jd-portfolio-1',
    textEn: 'Walk me through a portfolio analysis you led — what positions did you stress-test and why?',
    dimension: 'portfolio',
    source: 'jd',
  },
  {
    id: 'jd-portfolio-2',
    textEn: 'How do you decide asset allocation changes when market volatility spikes?',
    dimension: 'portfolio',
    source: 'jd',
  },
  {
    id: 'jd-risk-1',
    textEn: 'Describe a risk report you prepared for senior stakeholders. What metrics did they care about most?',
    dimension: 'risk',
    source: 'jd',
  },
  {
    id: 'jd-risk-2',
    textEn: 'Give an example where you flagged a risk early — how did you quantify and escalate it?',
    dimension: 'risk',
    source: 'jd',
  },
  {
    id: 'jd-excel-1',
    textEn: 'Tell me about a financial model you built in Excel. How did you separate inputs, calculations, and outputs?',
    dimension: 'excel',
    source: 'jd',
  },
  {
    id: 'jd-experience-1',
    textEn: 'Which finance roles best prepared you for portfolio-level decision support at OIA?',
    dimension: 'experience',
    source: 'jd',
  },
  {
    id: 'jd-education-1',
    textEn: 'How does your academic background support complex investment analysis in this role?',
    dimension: 'education',
    source: 'jd',
  },
  {
    id: 'jd-communication-1',
    textEn: 'How do you adapt a technical portfolio update for both investment committee members and non-finance executives?',
    dimension: 'communication',
    source: 'jd',
  },
  {
    id: 'jd-communication-2',
    textEn: 'Describe a time you had to deliver difficult performance news — what was your approach?',
    dimension: 'communication',
    source: 'jd',
  },
]

export function jdQuestionsByDimension() {
  const groups = new Map<string, InterviewQuestion[]>()
  for (const dim of FINANCE_JOB.dimensions) {
    groups.set(dim.key, JD_INTERVIEW_QUESTIONS.filter((q) => q.dimension === dim.key))
  }
  return groups
}
