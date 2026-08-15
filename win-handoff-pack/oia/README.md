# OIA RFQ 5302 — Demo Prototype

Vertical-slice prototype for the evaluation demo journey (S0–S8).

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:5173`).

## What this prototype covers

| Step | Capability |
|------|------------|
| S0 | Offline mode banner (simulated egress disabled) |
| S1 | CV upload wizard, parsed/review/missing fields, draft & submit |
| S2 | CV diff update (experience + certification) |
| S3 | Matching dashboard with evidence-linked scores, filters, CSV export |
| S4 | Shortlist / disqualify with required human reason |
| S5 | MCQ assessment with score breakdown |
| S6 | Bilingual avatar interview with dynamic follow-up (UI simulation) |
| S7 | Evidence-linked report + candidate improvement tips |
| S8 | Final human decision + full audit log |

## Notes

- Jadarah integration uses **simulated endpoint** labels (no live API).
- Avatar uses a **2D phoneme→viseme rig** placeholder — not production ASR/TTS.
- Synthetic data only; no real candidate PII.

## Build

```bash
npm run build
npm run preview
```
