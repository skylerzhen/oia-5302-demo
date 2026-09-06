# Platform UI Agent Brief - OIA RFQ 5302

> **Purpose:** Persistent KV-cache for Cursor sessions on branch `platform-ui`.  
> **Source of truth:** Recruitment Interface Reference.pdf + meeting MoM (2026-09).  
> **Workflow:** Incremental UI changes - one screen or layer at a time.

---

## 1. Project snapshot

| Item | Detail |
|------|--------|
| Repository | skylerzhen/oia-5302-demo |
| Local path | C:\Users\Admin\Projects\oia-5302-demo |
| Active branch | **platform-ui** (UI redesign) |
| Stable release | main @ **v0.4.1** - live demo must keep working |
| Stack | React + Vite, Express API, LiveAvatar + OpenAI TTS |
| Data | Synthetic only; mock AI labelled for future GPU models |

---

## 2. Architecture (from PDF)

### Three surfaces, one record

- **Candidate Platform** (Jadarah-style)
- **HR Platform** (OIA SSO-style)
- **Journey Test Channel** - nav overlay only, NOT a third data copy

All three read/write **ONE application record** in DemoContext (12-step state machine S0-S8).

### State machine (high level)

| Phase | Candidate | HR |
|-------|-----------|-----|
| S0-S2 | Landing, role, upload | SSO mock, dashboard |
| S3-S5 | CV parse confirm (C1) | Match list, weights (H1) |
| S6-S7 | Assessment / prep | Candidate detail |
| S8 / C4 | AI interview | Interview review (H3), decision (H4-H5) |

---

## 3. Visual system - Sovereign Navy

### Colour palette

| Token | Hex | Usage |
|-------|-----|-------|
| navy900 | #0B1A2F | Sidebar background |
| navy800 | #13243B | Sidebar hover |
| navyPrimary | #13315C | Primary buttons, active nav |
| canvas | #F4F7FB | Page background |
| card | #FFFFFF | Card surfaces |
| hairline | #E3E8F0 | Borders |

Do not use teal or bright green as primary accent.

### Typography

- **Titles:** Source Serif 4
- **Body:** Inter 13px
- **Scores/IDs:** IBM Plex Mono

### Radius

- Max **6px** on cards; controls 4px; no rounded-xl

### Layout shell

- Sidebar **235px** navy900
- Top bar + card grid on canvas
- Implement in Layout.tsx + App.css

### Evidence Review pattern (screen 06)

```
SOURCE (left)     |  EXTRACTED (right)
PDF/CV or video   |  Fields + confidence + evaluation
```

Reused for C1, HR detail, H3 interview.

Components: CvSourcePreview, CvReviewPanel, InterviewReviewPanel, CvProfilePanel.

### Interaction rules

- One filled navy primary CTA per view
- Secondary = outline or ghost on tint ground
- Status = pill on coloured tint
- Bilingual EN/AR with RTL where required
- Zero CJK in user-facing strings (CI enforced)

---

## 4. PDF screen mapping

| # | PDF name | Key files |
|---|----------|-----------|
| 01/02 | Sign-in + 2FA | RoleSelect (mock) |
| 03 | Command Centre | ScoreSummaryPanel, EvaluationReportPanel |
| 05 | Bulk Upload | CandidatePortal upload stepper |
| 06 | Evidence Review | CvReviewPanel, InterviewReviewPanel |
| 08 | Review Queues | HrPortal, MatchDashboard |
| - | Journey | CandidateJourneyPanel (nav only) |

---

## 5. Meeting deliverables (MoM)

1. UI/UX design doc (this file + CSS tokens)
2. Combined HR + Candidate user journey markdown
3. WOW feature list (P0/P1/P2)
4. HR interview playback (Shawn, Sam samples)
5. Candidate score + derivation (e.g. 87 from CV + dimensions)
6. Dual-portal simultaneous test on same record

---

## 6. Backlog

### P0 (verify after merge from main)

- Single application record across portals
- Config to candidate flow consistent
- Real interview recording playback
- Score consistency H1-H4 (derived from dimensions)
- Interview cap enforced
- No CJK in catalogue
- Hire / reject end-to-end
- Upload ID stable

Most P0 shipped on main v0.4.1 - re-verify after rebase onto platform-ui.

### P1 (WOW for demo)

- Sovereign navy shell + Evidence Review layout
- Candidate score derivation UI (Command Centre)
- HR pipeline as Review Queues
- Journey nav polish
- Mock SSO + 2FA visual fidelity

### P2 (nice-to-have)

- Deeper AR localisation
- Audit trail visual upgrade
- Integration status dashboard polish

---

## 7. Incremental work plan

| Step | Scope | Files | Status |
|------|-------|-------|--------|
| 1 | Design tokens + fonts | App.css, index.html | done |
| 2 | App shell (sidebar, topbar) | Layout.tsx, App.css | done |
| 3 | Evidence Review layout | CvReviewPanel, InterviewReviewPanel | partial |
| 4 | Candidate score | ScoreSummaryPanel, EvaluationReportPanel | done |
| 5 | Mock sign-in / 2FA | RoleSelect | done |
| 6 | HR Review Queues | HrPortal, MatchDashboard | done |
| 7 | User journey doc | docs/demo-5302/user-journey-combined.md | done |

One row per commit when possible. Describe PDF screen in commit message.

---

## 8. Deploy and environment

### Production URLs

| Service | URL |
|---------|-----|
| Frontend (primary) | https://oia-recruitment.uiscloud.cc |
| Frontend (backup) | https://oia-rfq-5302.surge.sh |
| Backend API | https://oia-5302-demo.onrender.com |

### Secrets (never commit llm.env)

| Variable | Where |
|----------|-------|
| VITE_API_SECRET | Surge build (llm.env) |
| API_SECRET | Render - must match frontend |
| VITE_LLM_API_URL | Surge to Render URL |
| LIVEAVATAR_* | Render |
| OPENAI_TTS_VOICE=onyx | Render |
| LIVEAVATAR_TTS_VOICE=onyx | Render |

LiveAvatar avatar ID: `e9844e6d-847e-4964-a92b-7ecd066f69df`

### Commands

```bash
npm run dev                 # local: API + Vite (Windows-safe)
npm run deploy:surge        # build + deploy frontend
npm run demo:offline        # offline issue demo
```

After Surge deploy: hard refresh (Ctrl+Shift+R).

---

## 9. Known fixes (do not regress)

| Issue | Fix location |
|-------|--------------|
| Windows npx ENOENT | scripts/dev-with-api.mjs - direct vite bin |
| UTF-16 llm.env on Windows | server/load-env.mjs |
| Surge deploy on Windows | scripts/deploy-surge-cloud.mjs |
| LiveAvatar 401 on Surge | VITE_API_SECRET in build env |
| PCM choppy lip-sync | ~1s chunks - server/liveavatar-session.mjs |
| Stuck Thinking | removed waitForLiveAvatarPlayback |
| Male voice | onyx in TTS handlers + render.yaml |

Server-side fixes require Render redeploy for production.

---

## 10. Component inventory

```
src/
  App.tsx                    routing, role, session
  App.css                    design tokens (primary edit surface)
  components/
    Layout.tsx               shell
    RoleSelect.tsx           landing / role
    CandidatePortal.tsx      candidate flow
    HrPortal.tsx             HR flow
    CvReviewPanel.tsx        C1 evidence review
    CvSourcePreview.tsx      left pane source
    InterviewReviewPanel.tsx H3 playback
    ScoreSummaryPanel.tsx    scores
    EvaluationReportPanel.tsx
    MatchDashboard.tsx       HR list
    CandidateJourneyPanel.tsx journey nav
    LiveAvatarStage.tsx      C4 avatar - do not break
  context/
    DemoContext.tsx          single record state
```

---

## 11. Agent session prompt (copy-paste)

```
You are working on OIA RFQ 5302 demo, branch platform-ui.
Read .cursor/rules/platform-ui-kv-cache.mdc and docs/demo-5302/platform-ui-agent-brief.md.

Goal: incremental UI aligned to Recruitment Interface Reference.pdf
(sovereign navy, Evidence Review pattern, 3 surfaces / 1 record).

Rules:
- One screen or token layer per change; minimal diff; match existing React patterns.
- Do not break LiveAvatar C4 or deploy URLs.
- Never commit llm.env.
- EN+AR where required; no CJK strings.
- After user-visible change: CHANGELOG [Unreleased]; deploy surge if asked.

Ask which slice (1-7) if unclear. Default: tokens+shell, then Evidence Review (06).
```

---

## 12. Next action

When user says "start incremental changes":

1. Confirm branch platform-ui and npm run dev works
2. Pick step 1 or 3 (tokens/shell or Evidence Review)
3. Show before/after in browser; one commit; wait for user OK before next slice

---

Last updated: 2026-09-06
