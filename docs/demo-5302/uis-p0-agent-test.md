# UIS P0 agent test playbook

> **Audience:** another Cursor / Codex / human tester who did not implement these changes.  
> **Product:** OIA RFQ 5302 recruitment demo (`C:\Users\Admin\Projects\oia-5302-demo`).  
> **UI language:** English only. Ignore any older bilingual / Chinese copy in historical docs.  
> P0 is on **GitHub `main`**. Prefer a fresh browser profile or **Reset demo** — old `localStorage` will look like a skipped C1→C4 jump.

---

## 0. Where to test

| Surface | URL / command | Notes |
|---------|----------------|-------|
| GitHub | `git clone` / `git pull origin main` from `skylerzhen/oia-5302-demo` | Required on any other machine |
| Production frontend | https://oia-recruitment.uiscloud.cc | Surge; backup https://oia-rfq-5302.surge.sh |
| Production API | https://oia-5302-demo.onrender.com | Render deploys from `main`. Wait until `/api/local-ai/status` is live before scoring ② |
| Local | `npm run dev` → http://localhost:5173 + API :8787 | Best for DevTools payload checks |
| Stale review zip | `uis-p0-review-latest.zip` | Do **not** re-review that zip |

**Same PC, second agent:** this folder or production.  
**Other PC / Cloud Agent:** `git pull origin main` first. If production HTML/JS looks pre-P0, wait for Surge/Render and hard-refresh.

---

## 1. Goal

Walk the **same application record** through Candidate + HR and mark each UIS P0 item **pass / fail / blocked**. Prefer a real browser (Playwright or Cursor browser tools). Do not “pass” an item from reading source unless the row says *static/code*.

Return a filled copy of **§8 Report template**.

---

## 2. Environment

```bash
cd C:\Users\Admin\Projects\oia-5302-demo
npm install
# llm.env must exist with OPENAI_API_KEY (copy from llm.env.example). Do not print secrets.
npm run dev
```

| Service | URL |
|---------|-----|
| App | http://localhost:5173 |
| Local API (required for ② / B) | http://localhost:8787 |

Sanity (expect `"llm": true` when the key is present):

```bash
curl -s http://localhost:8787/api/local-ai/status
```

Automated gates (run once before UI):

```bash
node scripts/check-cjk.mjs
npm run build
```

`check-cjk` must print `CJK check passed`. `npm run build` must finish with Vite `built`. If `check-cjk` dies with `SyntaxError` on UTF-16, that is item A — fail it.

**Browser:** Chromium or Edge. Two tabs, **same origin** (`localhost:5173`). Allow **camera + microphone** when C4 asks (or pre-allow for the origin). Incognito is fine if *both* tabs are in the same incognito window.

**Reset:** landing page → **Reset demo (clear all progress)** before a clean run. This clears `localStorage` session. Interview recordings live in IndexedDB `oia-recruitment-demo-v1` and may survive until you clear site data.

**Do not** open `/?demo=c4` for the full P0 path (it skips C1–C3). That URL is only for a C4-only smoke.

---

## 3. Dual-tab protocol (mandatory)

Session is **one record** in `localStorage` key `oia-5302-demo-session`. Interview blueprint is `oia5302-interview-config`. Tabs sync via `storage` events.

1. Tab **C** = Candidate portal. Tab **H** = HR portal. Never mix two different browsers / profiles.
2. After Candidate sign-in, copy the **Application ID** in the top bar (`OIA-5302-…`). HR must show the **same** ID.
3. If HR shows a Sara seed interview you did not just record, you polluted the record — Reset demo and restart.
4. **Load demo application** on H1 is allowed only on an **empty** record. If a candidate already uploaded/submitted, the button must **skip** and write audit `Demo load skipped`.

### Mock sign-in (both portals)

1. Landing → choose **Candidate portal** or **HR / Recruiter portal** (or **Journey test channel**).
2. Credentials are pre-filled. Submit.
3. MFA: tap the 6-digit simulated authenticator code so it fills the field → submit.  
   Candidate opens on **C1** even if an older step is in session. Resume via the left sidebar.

---

## 4. Fast smoke (about 20 minutes)

Use this if you only have one pass. Full matrix is §5.

| Step | Action | Pass if |
|------|--------|---------|
| 0 | `node scripts/check-cjk.mjs` then `npm run build` | Both green |
| 1 | Reset demo. Tab C: Candidate → C1. Note Application ID | ID present, page is Application not interview |
| 2 | Upload sample **01-sara-al-hinai-en.pdf**. Confirm extraction → Confirm all fields → Continue to submit → **Confirm & submit profile** | Fields filled; `cvUploadId` / application stays the same |
| 3 | C2 **Accept & continue to assessment**. C3 answer all MCQs → Submit exam → **Continue to AI interview** | C4 shows HR blueprint + question list + “Strong answer: …” |
| 4 | Tab H: HR → H1. Same Application ID. **Do not** click Load demo if data exists | Audit would show skip if you *do* click it. Queues show the live candidate, not a second record |
| 5 | H1 **Interview blueprint & JD weights** → edit one custom question + its Strong answer rubric to a unique phrase (e.g. `MUST cite OMR 4.2m`) → **Save blueprint** | Flash: `Interview blueprint saved — C4 will use this configuration.` |
| 6 | Tab C: reload C4. Queue / rubric show the unique phrase | Config crossed portals |
| 7 | DevTools → Network. Start interview (allow cam/mic). Answer once in English with a concrete metric. Submit the answer | `POST /api/local-ai/llm/follow-up` body contains `interviewConfig.questionRubrics` **and** your unique phrase |
| 8 | After ≥ min answers (default 5) submit interview. C5/C6 unlock. Tab H → H3 | Same ID; replay or transcript present; dimension evidence can seek a turn |
| 9 | H2: empty reason → Shortlist disabled; fill reason → Shortlist. H4: Hire/Reject disabled until shortlist+interview; fill reason → Recommend hire | C6 shows Recommended for hire |
| 10 | H1 match table: weak pool rows say **Below screening threshold**, not “Disqualified” | Copy only |

---

## 5. P0 matrix (score these)

Mark **P / F / B** (pass / fail / blocked). Evidence = screenshot, Application ID, and a one-line note.

### ① Dual-end same record

- Candidate sign-in **always** lands on C1 (sidebar to resume).
- Application ID is immutable for the run (does not change on HR login or C4 start).
- HR login does **not** auto-seed over a live candidate.
- Click **Load demo application** *after* C1 has data → audit **Demo load skipped** / “Active application record preserved”.
- Edit a field or complete C3 in tab C → tab H updates without refresh (or after a brief `storage` sync).

**Fail if:** HR shows a different name/ID, or a seeded Sara interview overwrites the live transcript.

### ② HR config reaches the interview + model (includes review item B)

UI chain:

1. H1 → **Interview blueprint & JD weights**.
2. Change: custom question text, **Strong answer** rubric, min/max answers, follow-up dimensions, prohibited topics.
3. **Save blueprint**.
4. Tab C C4: blueprint card lists the same questions, rubrics, dimensions.

Network / model chain (this was the remaining gap; must re-verify):

1. DevTools filter `follow-up` and `generate-assessment`.
2. Follow-up POST JSON must include `interviewConfig.questionRubrics` (array of `{ questionId, textEn, strongAnswerRubric }`).
3. After interview submit, C5 and/or H3 `generate-assessment` POST must include the same `interviewConfig`.
4. Optional: set a rubric `MUST mention liquidity coverage ratio`. Give a thin answer that does not mention it. Follow-up should probe that gap; assessment rationale should not claim the criterion was met.

**Fail if:** rubric is visible in C4 but absent from those request bodies, or assessment ignores an unmet rubric with a hire-leaning sentence while scores are low.

Hard-stop helper for later: set **max answers = 2**, save, then use ⑤. Restore 10 when done.

### ③ Real recording + playback

- Allow camera + microphone **before** Start interview.
- Complete at least two candidate answers, then **Submit interview**.
- H3: video (or audio) replay exists for this `applicationId`.
- Click a dimension evidence quote / turn → player seeks near that fragment (timestamped transcript).
- IndexedDB: Application → Storage → `oia-recruitment-demo-v1` → `interview-recordings` keyed by Application ID.

**Blocked (not a product fail) if:** permission was denied. Then check audit for `Session recording unavailable`. Re-run with permission granted. Silent no-blob + no audit = fail.

### ④ Recommendation does not contradict scores

- On H3/C5, if interview/overall scores are low, LLM blurb must **not** praise / recommend hire.
- Look for a line like `Deterministic scores are authoritative…`.
- High score must not be overwritten by a “reject / weak” narrative.

Use a thin-answer take (one-liners) vs the Sara script in `docs/demo-5302/c4-interview-test-script.md`.

### ⑤ Interview hard stop

Default copy after 10 answers:  
`Maximum 10 answers reached — submit to unlock scoring.`

Faster: blueprint **max answers = 2**, then the banner uses that number. Further Submit answer is blocked. **Submit interview** still works and sets `interviewCompleted` even if avatar/TTS is unhappy. C5 and C6 unlock.

### ⑥ CJK clear

```bash
node scripts/check-cjk.mjs
```

Pass: `CJK check passed (src ts/tsx/css + UTF-8 encoding on src/scripts/server).`  
Encoding: `src/lib/interviewRecording.ts`, `src/lib/pipelineHelpers.ts`, `scripts/check-cjk.mjs` must start with ASCII `import` (UTF-8, no BOM). PowerShell:

```powershell
Format-Hex src\lib\interviewRecording.ts | Select-Object -First 1
```

First bytes must **not** be `FF FE`.

### ⑦ Decision controls

- H2 Shortlist / Decline: buttons disabled until a written reason.
- H4 **Recommend hire** / **Reject**: disabled until shortlisted **and** this application has an interview; disabled state shows why.
- Confirm with required final reason → C6 status updates (`Recommended for hire` / `Not selected`).
- Visible label is **not** “Disqualified” (internal variable `disqualified` is OK).

### ⑧ CV upload fail-closed

- Known samples on C1: Sara PDF, Khalid DOCX, Noor scanned PDF — these parse.
- Upload a random file (e.g. empty `notes.txt` or an unrelated PDF **whose filename does not contain** `sara` / `khalid` / `noor` / `scan`) → error, **no** Sara fixture profile.
- After a known sample, a bound `uploadId` exists on the record (`upload-…` or sample id). Switching sample does not keep the previous person’s name.

**Pitfall:** filename substring matching. `sarah-cv.pdf` can still hit the Sara fixture. Use a name like `random-offer.pdf` for the fail-closed case.

### ⑨ Current-role mapping (Khalid)

Reset demo. Upload **02-khalid-al-balushi-en.docx**. On C1/C2 Current role, expect filled (not blank) **company / title / industry / location**, e.g.:

- Company: Oman Infrastructure Holdings  
- Title: Financial Reporting Analyst  
- Industry: Infrastructure holdings  
- Location: Muscat, Oman  

Projection only fills **missing** scalars; it must not invent a second employer over an already-parsed company.

### ⑩ Labels

H1 match dashboard: unqualified pool rows show **Below screening threshold**. Search the UI for `Disqualified` — must be absent (code `disqualified` is allowed).

---

## 6. Suggested full journey (one record)

Keep **one** Application ID for the whole table.

| Order | Tab | Screen | What to do |
|------|-----|--------|------------|
| 1 | C | Entry | Reset demo → Candidate sign-in + MFA |
| 2 | H | Entry (new tab) | HR sign-in + MFA → H1. Confirm same ID, empty/live candidate, **no** auto seed |
| 3 | H | H1 modal | Unique rubric + optional max=2 → Save blueprint |
| 4 | C | C1 | Sara sample → Confirm extraction → Confirm all fields → Confirm & submit profile |
| 5 | C | C2 | Accept & continue to assessment |
| 6 | C | C3 | Answer MCQs → Submit exam → Continue to AI interview |
| 7 | C | C4 | Confirm blueprint/rubric. Allow cam/mic. Start. Answer with metrics (script below). Submit interview |
| 8 | C | C5 / C6 | Score visible; status pending HR |
| 9 | H | H3 | Replay + evidence seek + assessment (check generate-assessment payload) |
| 10 | H | H2 | Reason required → Shortlist |
| 11 | H | H4 | Recommend hire + reason |
| 12 | C | C6 | Hire outcome + HR note |
| 13 | H | H5 | Audit contains skip-seed (if tested), blueprint save, interview complete, hire |

### C4 answer script (short)

From `docs/demo-5302/c4-interview-test-script.md`. One dense English paragraph per turn is enough:

> Last quarter I led the quarterly portfolio variance analysis for our sovereign wealth fund subsidiary. I rebuilt the sector concentration model in Excel and flagged a 12% overweight in financials versus our investment policy limit. I presented the findings to the investment committee with a risk heat map.

Weak contrast (for ④ / rubric miss): `I did some finance work and talked to my manager.`

---

## 7. Known pitfalls (do not file as new P0 bugs unless still true)

| Item | Note |
|------|------|
| Camera/mic deny | Recording silently skipped except audit `Session recording unavailable`. Pre-allow the origin. |
| CJK gate | Content scan is `src` ts/tsx/css. `scripts/` handoff PDFs may contain CJK and are **out of** the content gate; UTF-16 in `scripts/server` **is** gated. |
| Sample filename | `sara` / `khalid` / `noor` / `scan` substrings select fixtures. |
| `?demo=c4` | Skips C1–C3. Not the P0 path. |
| Offline toggle on landing | Blocks egress; LLM/avatar will fall back. Keep **Connected** for ② / ③. |
| Assessment cache | `localStorage` `oia5302-llm-assessment-cache`. If you change rubrics after a scored take, hard-refresh or Reset demo so H3 regenerates. |
| Journey channel | Overlay navigator only — not a third data copy. |
| LiveAvatar | Cloud key optional locally. 2D fallback is OK for P0 scoring as long as transcript + recording path still run. |

---

## 8. Report template (paste back)

```
Workspace: C:\Users\Admin\Projects\oia-5302-demo
App: http://localhost:5173
Application ID:
Build: pass / fail (paste last line)
CJK: pass / fail

① same record:
② config + rubric payload (follow-up / generate-assessment):
③ recording + H3 seek:
④ score vs narrative:
⑤ hard stop:
⑥ CJK / UTF-8:
⑦ hire/reject gates:
⑧ unknown CV fail-closed:
⑨ Khalid current role:
⑩ Below screening threshold:

Blockers:
Notes (payload snippets, not secrets):
```

Static code checks if UI time is short (still record them as *code*, not *demo*):

- `server/llm-handlers.mjs` — `collectQuestionRubrics` / `hrStrongAnswerRubrics` in follow-up **and** generate-assessment.
- `src/lib/interviewRecording.ts` file bytes UTF-8 (`69 6D 70 6F 72 74` = `import`).