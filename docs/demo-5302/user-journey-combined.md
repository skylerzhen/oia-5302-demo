# Combined User Journey - OIA RFQ 5302 Demo

> HR + Candidate paths over **one application record** (browser session).  
> Visual system: Sovereign Navy (PDF screen map).  
> Updated: 2026-09-06 (platform-ui branch)

---

## Architecture

```
                    +------------------+
                    |  Portal entry    |
                    |  Sign-in (01)    |
                    |  2FA (02)        |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     Candidate portal                HR portal
     (Jadarah token)                  (OIA SSO)
              |                             |
              +--------------+--------------+
                             |
                  ONE application record
                  (DemoContext session)
                             |
              +--------------+--------------+
              |                             |
        12-step state machine        Journey overlay (nav only)
        C1-C6 / H1-H5                CandidateJourneyPanel
```

**Rule:** Journey test channel is navigation only - it does not fork data.

---

## Candidate journey (C1-C6)

| Step | PDF screen | Action | HR visibility |
|------|------------|--------|---------------|
| Entry | 01/02 | Mock Jadarah sign-in + MFA (`530206`) | - |
| C1 | 05 Bulk upload / 06 Evidence | Upload CV, parse, confirm fields | Same record when HR loads queue |
| C2 | 06 Evidence | Confirm profile updates | - |
| C3 | - | Role MCQ assessment (auto-scored) | Assessment score on live row |
| C4 | - | AI avatar interview (LiveAvatar) | Recording available in H3 |
| C5 | 03 Command Centre | Composite score + CV dimensions + tips | Weights from HR rubric |
| C6 | - | Application status (shortlist / final) | Driven by HR H2/H4 |

### Candidate WOW moments

1. **Evidence Review (C1)** - source CV left, extracted fields right, locate-in-CV highlight
2. **Offline toggle** - egress blocked during avatar segment
3. **Command Centre (C5)** - large mono score, derivation formula, pillar KPIs
4. **Transparent tips** - improvement list tied to unmatched JD dimensions

---

## HR journey (H1-H5)

| Step | PDF screen | Action | Candidate impact |
|------|------------|--------|------------------|
| Entry | 01/02 | Mock OIA SSO + MFA (`530206`) | - |
| H1 | 08 Review queues | Config sidebar + ranked queue table | Reads same application as candidate |
| H2 | 08 | Shortlist or decline with reason | C6 status updates |
| H3 | 06 Evidence (interview) | Recording playback + LLM evaluation | Candidate cannot access |
| H4 | 03 Command Centre (HR) | Weighted composite, hire/reject gate | Final outcome on C6 |
| H5 | - | Audit trail + demo closing | - |

### HR WOW moments

1. **Review queues** - live application row highlighted (Sara / primary record)
2. **Interview replay (H3)** - avatar video + transcript turns (demo: complete C4 or Load demo)
3. **Evidence-linked scoring** - dimension bars drill to CV spans
4. **Human gate** - AI recommends, recruiter confirms with audit log

---

## Dual-portal test script

Run in **one browser** (session shared):

1. Open app - pick **Candidate**, MFA `530206`
2. Upload Sara CV (or use demo shortcut `?demo=c4` for interview-only)
3. Complete C3 assessment and C4 interview - submit to C5, note composite score
4. **Exit portal** - pick **HR**, MFA `530206`
5. H1 Review queues - confirm live row shows assessment % and interview turns
6. H3 - play interview recording
7. H4 - confirm overall weighted score matches C5 formula (same pillar weights)
8. Shortlist in H2, hire/reject in H4
9. Return to Candidate C6 - verify status reflects HR decision

---

## Prioritized feature backlog (MoM)

### P0 - demo credibility

- [x] Single application record across portals
- [x] Upload ID stable, interview cap enforced (main v0.4.1)
- [x] Score consistency H1-H4-C5 (dimension-derived)
- [x] HR interview playback in H3
- [x] Candidate score + derivation in C5
- [x] No CJK in string catalogue (CI)

### P1 - WOW (platform-ui)

- [x] Sovereign navy shell + tokens
- [x] Evidence Review layout (C1, H3)
- [x] Command Centre candidate score (C5)
- [x] Review Queues with config split (H1)
- [x] Mock sign-in + 2FA (01/02)
- [x] Combined user journey (this document)

### P2 - nice-to-have

- [ ] Deeper AR RTL on all steps
- [ ] Shawn/Sam named sample presets (optional demo seeds)
- [ ] Journey overlay deep-link to exact step

---

## Screen to component map

| PDF | Component |
|-----|-----------|
| 01/02 Sign-in + 2FA | `RoleSelect.tsx` |
| 03 Command Centre | `CandidateScorePanel.tsx`, `ScoreSummaryPanel.tsx` |
| 05 Bulk upload | `CandidatePortal` C1 upload |
| 06 Evidence Review | `CvReviewPanel`, `InterviewReviewPanel` |
| 08 Review Queues | `MatchDashboard`, `HrPortal` H1 |
| Journey nav | `CandidateJourneyPanel` |

---

## Deploy notes

- Frontend: https://oia-recruitment.uiscloud.cc
- API: https://oia-5302-demo.onrender.com
- Branch: `platform-ui` for UI work; `main` for stable demo
