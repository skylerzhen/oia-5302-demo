import type { DemoSession } from './session'
import { INTERVIEW_PRESET } from '../data/questions'
import { buildArabicFollowUp, buildInterviewFollowUp } from './matching'

/** Seed data so HR portal can be demoed without walking candidate flow first. */
export function createDemoPipelinePatch(): Partial<DemoSession> {
  return {
    pipeline: {
      profileSubmitted: true,
      diffAccepted: true,
      assessmentSubmitted: true,
      interviewCompleted: true,
      shortlisted: false,
      disqualified: false,
      finalDecisionMade: false,
      finalDecisionType: null,
    },
    assessmentScore: 75,
    interviewTurns: [
      { id: 'seed-g', speaker: 'avatar', language: 'en', text: INTERVIEW_PRESET[0].text },
      {
        id: 'seed-c',
        speaker: 'candidate',
        language: 'en',
        text: 'I led a quarterly portfolio variance review for a sovereign fund subsidiary and presented risk drivers to the board.',
      },
      {
        id: 'seed-fu',
        speaker: 'avatar',
        language: 'en',
        text: buildInterviewFollowUp('quarterly portfolio variance review'),
      },
      { id: 'seed-ar', speaker: 'candidate', language: 'ar', text: 'أعددنا تقريراً ربع سنوياً يوضح التباين بين التوقعات والنتائج الفعلية.' },
      { id: 'seed-fu-ar', speaker: 'avatar', language: 'ar', text: buildArabicFollowUp() },
    ],
  }
}
