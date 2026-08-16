import type { DemoSession } from './session'
import { INTERVIEW_PRESET } from '../data/questions'
import { primaryCandidateProfileFields } from '../data/candidates'
import { buildInterviewFollowUp } from './matching'

/** Pre-unlock C1–C3 so reviewers can jump straight to the avatar interview. */
export function createDemoCandidateC4Patch(): Partial<DemoSession> {
  return {
    candidateStep: 'C4',
    offline: true,
    fields: primaryCandidateProfileFields(),
    pipeline: {
      profileSubmitted: true,
      diffAccepted: true,
      assessmentSubmitted: true,
      interviewCompleted: false,
      shortlisted: false,
      disqualified: false,
      finalDecisionMade: false,
      finalDecisionType: null,
    },
    assessmentScore: 75,
    interviewTurns: [],
  }
}

/** Seed data so HR portal can be demoed without walking candidate flow first. */
export function createDemoPipelinePatch(): Partial<DemoSession> {
  return {
    fields: primaryCandidateProfileFields(),
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
    ],
  }
}
