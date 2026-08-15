/**
 * ~6 minute demo pacing — aligned to OIA-Demo-Narration-Script.md beats.
 * Total target ≈ 360s (user narrates along while watching).
 */
export const TARGET_DURATION_SEC = 360

/** Hold durations in ms — tuned for English narration pace */
export const HOLDS = {
  // 1 · Opening (0:00–0:30)
  landingIntro: 30_000,

  // 2 · S0 network (0:30–0:45)
  afterNetwork: 15_000,

  // 3 · C1 (0:45–1:35)
  afterEnterPortal: 8_000,
  afterUpload: 14_000,
  afterConfirm: 12_000,
  afterSubmit: 14_000,

  // 4 · C2 (1:35–1:55)
  c2Review: 16_000,
  afterC2: 10_000,

  // 5 · C3 (1:55–2:25)
  perMcq: 5_000,
  afterExam: 12_000,
  afterContinueInterview: 10_000,

  // 6 · C4 (2:25–3:30)
  c4Intro: 12_000,
  afterAvatarGreet: 14_000,
  afterEnglish: 16_000,
  afterArabicSegment: 16_000,
  afterSubmitInterview: 14_000,

  // 7 · C5/C6 + exit (3:30–3:50)
  c5Status: 12_000,
  afterExit: 10_000,

  // 8 · H1 (3:50–4:30)
  h1Dashboard: 22_000,
  afterH1Scroll: 18_000,

  // 9 · H2 (4:30–4:50)
  h2Form: 14_000,
  afterShortlist: 12_000,

  // 10 · H3 (4:50–5:20)
  h3Play: 22_000,
  afterH3: 10_000,

  // 11 · H4 (5:20–5:45)
  h4Form: 16_000,
  afterH4: 12_000,

  // 12 · H5 + close (5:45–6:00)
  h5Audit: 22_000,
  closing: 14_000,
}

/** PDF / script section labels for marker file */
export const SECTIONS = [
  '01-open',
  '02-s0',
  '03-c1',
  '04-c2',
  '05-c3',
  '06-c4',
  '07-c56',
  '08-h1',
  '09-h2',
  '10-h3',
  '11-h4',
  '12-h5',
  '13-close',
]
