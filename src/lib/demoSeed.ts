import type { DemoSession } from './session'
import { INTERVIEW_PRESET } from '../data/questions'
import { primaryCandidateProfileFields } from '../data/candidates'
import { getCvParseProfile } from '../data/cvParseProfiles'
import { buildInterviewFollowUp } from './matching'

function seedProfileExtras() {
  const seed = getCvParseProfile('pdf-en')
  return {
    profileSkills: seed?.skills ?? { items: [], status: 'missing' as const, evidence: '', source: '' },
    profileLanguages: seed?.languages ?? { items: [], status: 'missing' as const, evidence: '', source: '' },
    profileWorkHistory: seed?.workHistory ?? [],
  }
}

/** Pre-unlock C1–C3 so reviewers can jump straight to the avatar interview. */
export function createDemoCandidateC4Patch(): Partial<DemoSession> {
  return {
    candidateStep: 'C4',
    offline: false,
    fields: primaryCandidateProfileFields(),
    ...seedProfileExtras(),
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
    ...seedProfileExtras(),
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
      { id: 'seed-g', speaker: 'avatar', language: 'en', text: INTERVIEW_PRESET[0].text, recordedAt: new Date().toISOString(), offsetMs: 0 },
      {
        id: 'seed-c1',
        speaker: 'candidate',
        language: 'en',
        text: 'I led a quarterly portfolio variance review for a sovereign fund subsidiary and presented risk drivers to the board.',
      },
      {
        id: 'seed-fu1',
        speaker: 'avatar',
        language: 'en',
        text: buildInterviewFollowUp('quarterly portfolio variance review', 0),
      },
      {
        id: 'seed-c2',
        speaker: 'candidate',
        language: 'en',
        text: 'We tracked duration and sector drift against a 60/40 benchmark, flagging breaches above 150 bps.',
      },
      {
        id: 'seed-fu2',
        speaker: 'avatar',
        language: 'en',
        text: buildInterviewFollowUp('duration and sector drift', 1),
      },
      {
        id: 'seed-c3',
        speaker: 'candidate',
        language: 'en',
        text: 'The investment committee approved a liquidity rebalance; I documented assumptions in a version-controlled Excel model.',
      },
      {
        id: 'seed-fu3',
        speaker: 'avatar',
        language: 'en',
        text: buildInterviewFollowUp('liquidity rebalance Excel model', 2),
      },
    ],
  }
}
