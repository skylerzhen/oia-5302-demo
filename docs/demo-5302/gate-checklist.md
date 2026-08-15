# OIA 5302 — Gate Checklist and Evidence Register

This is the working evidence register for the 8/16 internal acceptance review.
Do not mark a Gate passed until its listed human verification and evidence file
exist.

| Gate | Pass condition | Current implementation status | Required final evidence | Owner for verification |
|---|---|---|---|---|
| G1 — offline journey | Physical external egress disabled; S1–S8 complete; DNS/HTTP zero external calls | Local-only build, CSP, egress guard and localhost runner complete | Network-monitor recording + logs + rehearsal video | FDE + Ella |
| G2 — Avatar capability | EN/AR lip movement, 3 expression states, gestures, pause response, language switch | Deterministic 2D viseme rig, expression states, gesture and pause UI complete | Timed rehearsal recording | Ella |
| G3 — dynamic follow-up | Two rehearsals with different answers yield answer-specific follow-ups | Two data-pack variants and answer quotation logic complete | Rehearsal A/B comparison table + videos | FDE |
| G4 — Arabic review | Understandable Arabic, no material misread, coherent follow-up, subtitle spot-check | Arabic text and RTL path complete; human validation pending | Signed native-speaker review | Arabic reviewer |
| G5 — evidence-linked scores | Five sampled scores open relevant CV/transcript evidence | Matching evidence modal and interview report implemented | Screen recording + sample record | Ella |
| G6 — human authority | Empty reason is rejected for shortlist, disqualify and final decision | UI gates implemented | Video containing failed empty-reason attempts | Ella |
| G7 — audit | Four action classes with actor and timestamp visible | Session audit + CSV export implemented | H5 recording + CSV | Ella |
| G8 — scope fidelity | No unsupported claims, real PII, performance figures or real Jadarah endpoint | Labels and synthetic data package implemented | Signed scope review | Ella |
| G9 — fallback | S1–S8 independent fallback recordings, switch in ≤10 sec | Recording plan pending | Fallback folder and rehearsal | FDE |
| G10 — delivery | 8/16 Go/No-Go, 8/17 delivery | Pending | Meeting outcome | Ella |

## Rehearsal command

```bash
npm run demo:offline
```

Open the printed `http://127.0.0.1:<port>` address, start local network
monitoring, then physically disconnect external network before S1. The service
is deliberately bound to localhost only.

## Required evidence naming

```text
deliverables/demo-5302/
  rehearsal-01.mp4
  rehearsal-02.mp4
  fallback/S1.mp4 ... fallback/S8.mp4
  evidence/offline-monitor.log
  evidence/dynamic-followup-comparison.md
  evidence/arabic-native-review.md
  evidence/scope-signoff.md
```
