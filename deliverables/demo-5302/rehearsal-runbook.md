# OIA 5302 — Rehearsal Runbook (S0–S8)

Use this script for `rehearsal-01.mp4` and `rehearsal-02.mp4`. Rehearsal B only changes the C4 English answer (see G3 comparison doc).

## Before recording

```bash
npm run demo:offline
node scripts/offline-monitor.mjs
```

1. Start local network monitor in a second terminal.
2. Open the printed `http://127.0.0.1:<port>` URL.
3. Start screen recording.
4. Disconnect Wi-Fi before S1.

## S0 — Offline policy

- Landing page → Candidate portal
- Confirm offline pill / network status shows egress blocked in C4

## S1 — CV upload

- Upload `01-sara-al-hinai-en.pdf`
- Upload `02-khalid-al-balushi-en.docx`
- Upload `04-noor-al-hashmi-ar-scan.pdf`
- Confirm education field = review for Arabic scan
- Review & submit profile

## S2 — CV update

- Open `07-sara-v2-update.pdf` source link
- Accept 7→8 years and CFA Level II diff

## S3 — HR matching

- Switch role → HR
- H1: show six ranked candidates
- Open evidence for Portfolio analysis on Sara
- Export CSV

## S4 — Shortlist / disqualify

- H2: attempt shortlist with empty reason → blocked
- Shortlist reason: `Evidence shows portfolio analysis, controlled reporting and bilingual communication.`
- Disqualify Yusuf with empty reason → blocked
- Disqualify reason: `Marketing profile does not evidence the finance, portfolio or risk requirements.`

## S5 — Assessment

- Candidate → C3
- Complete 4 bilingual MCQs
- Confirm score / accuracy / duration / benchmark KPIs

## S6 — Avatar interview

- C4: complete greeting + English answer
- Rehearsal A or B answer from `evidence/dynamic-followup-comparison.md`
- Arabic question + Arabic answer
- Use Interrupt / I need a moment once

## S7 — HR review

- H3: transcript + evaluation report with evidence quotes

## S8 — Final decision + audit

- H4: final reason required
- Reason: `Human review confirms evidence-linked match, assessment and bilingual interview performance.`
- H5: export audit CSV

## After recording

Save files under:

```text
deliverables/demo-5302/rehearsal-01.mp4
deliverables/demo-5302/rehearsal-02.mp4
deliverables/demo-5302/evidence/offline-monitor.log
```
