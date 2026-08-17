# OIA 5302 — Repeatable Evaluation Demo Scenario

## Story

OIA is filling one synthetic Senior Financial Analyst role. Six synthetic
candidates enter the matching pool. The live candidate journey follows **Sara
Al-Hinai**; HR later compares the pool, shortlists Sara, disqualifies Yusuf
with a recorded reason, reviews the interview evidence, and makes the final
human decision.

## Scene plan

| Scene | Live action | Dataset evidence |
|---|---|---|
| S0 | Switch to offline policy, then physically disconnect external network in rehearsal | Local build and network-monitor record |
| S1 | Upload the English PDF, DOCX and Arabic scanned PDF; review parsed, review and missing fields | Sara CV variants and OCR review state |
| S2 | Upload Sara v2; accept seven-to-eight years and CFA Level II change | `06-sara-v2-update.md` |
| S3 | Show six ranked candidates; filter skill, years and degree; drill into score evidence; export | Candidate CV source pack and JD rubric |
| S4 | Shortlist Sara with reason; disqualify Yusuf with reason; show blank-reason rejection first | Sara and Yusuf profiles |
| S5 | Candidate completes four bilingual MCQs; show score, accuracy, duration and benchmark | Question bank |
| S6 | Avatar greeting → English answer → dynamic follow-up → Arabic question → Arabic response → evaluation | Two rehearsal answer variants below |
| S7 | Show candidate improvement view and HR report, with transcript citations per dimension | Interview transcript |
| S8 | HR selects Hire or Reject, supplies reason, then exports audit log | Audit events from S1, S4, S6 and S8 |

## Dynamic-follow-up rehearsal variants

Both rehearsals use the same opening question:

> Please describe a recent portfolio analysis you led and how you communicated
> risks to senior stakeholders.

### Rehearsal A — variance path

Candidate answer:

> I led a quarterly portfolio variance review for a sovereign fund subsidiary.
> I isolated duration and sector-allocation drivers, then presented the risk
> impact and recommended actions to the board.

Expected dynamic follow-up:

> You mentioned the quarterly portfolio variance review. How did you quantify
> the risk impact before presenting it to the board?

### Rehearsal B — liquidity path

Candidate answer:

> I consolidated liquidity exposure across three portfolios and escalated a
> threshold breach to the investment committee with a proposed rebalancing
> action.

Expected dynamic follow-up:

> You mentioned a liquidity threshold breach. Which threshold or KPI triggered
> the escalation, and what action did the investment committee approve?

The follow-up must use terms from the current answer, not the prior rehearsal.

## Arabic segment

Avatar question:

> كيف تتعامل مع الفروقات بين التوقعات والنتائج الفعلية في تقاريرك الربع سنوية؟

Candidate response:

> أبدأ بتحديد مصدر الفرق بين التوقعات والنتائج الفعلية، ثم أقارن الأداء
> بالمؤشرات المعتمدة وأرفع أي تجاوز للحدود إلى الجهة المختصة مع توصية واضحة.

Expected follow-up:

> ما المؤشر الذي تستخدمه لتحديد أن الفرق يحتاج إلى تصعيد، وكيف توثق توصيتك؟

## Human-gate script

- First attempt shortlist with an empty reason: submission must be blocked.
- Enter: `Evidence shows portfolio analysis, controlled reporting and bilingual communication.`
- First attempt disqualify Yusuf with an empty reason: submission must be blocked.
- Enter: `Marketing profile does not evidence the finance, portfolio or risk requirements.`
- Final decision reason: `Human review confirms evidence-linked match, assessment and bilingual interview performance.`
