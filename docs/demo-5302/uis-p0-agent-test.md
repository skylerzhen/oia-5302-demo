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

### Honest limit (read before you start)

This file is **not** a human substitute. A Cursor / Playwright agent with a real browser can walk the **click path** (C1→C6 and H1→H5) and score most P0 rows. It cannot do what a person does with lungs, eyes, and an OS permission prompt.

| Like a human? | Item |
|---------------|------|
| Yes, if you click | Sign-in, MFA (tap the 6-digit code), Sara sample, C2/C3, typed C4 answers, HR blueprint, shortlist, hire, labels |
| Partial | Dual-tab same record (must **open a new tab to the same URL**, never Duplicate Tab, never **Exit portal**) |
| Usually no | Speak into the mic, grant camera/mic like a person, judge LiveAvatar lip-sync, 10 spoken rounds |
| Forbidden as a “pass” | Grep source / read `llm-handlers.mjs` and mark ②/③ pass. Code-only notes go in the report as **code**, not **demo** |

If you have **no browser tool**, stop after `npm run build` / `check-cjk` and mark UI rows **blocked**, not pass.

Use **§3b Agent click script** as the mechanical path. Use §5 only as the scoring rubric.

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

**Reset:** landing page → **Reset demo (clear all progress)** before a clean run. This clears `localStorage` session. Interview recordings are stored on the API (`data/interview-recordings/` on Render / local server). IndexedDB `oia-recruitment-demo-v1` is only a same-browser cache.

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

### 3b. Agent click script (typed C4, max=2)

Open **production** https://oia-recruitment.uiscloud.cc **or** local http://localhost:5173. Stay **Connected** (do not toggle offline). Browser: Chromium/Edge.

**Never click `Exit portal`.** That is full reset (`logout`), not “back to landing”.  
**Never Duplicate Tab.** Duplicate copies in-memory `role`, so both views stay Candidate. Dual-portal = **new tab** → same URL → landing (role is not restored from storage).

Hard waits: after each primary action wait until the heading/button in the next step is visible (up to 15s). After **Send typed answer**, wait until the button is no longer `Generating follow-up…` (up to 45s).

1. Landing → **Reset demo (clear all progress)**.
2. **Candidate portal** → **Continue to MFA** → click the large 6-digit **OIA Authenticator** code (it fills the field) → **Verify and enter portal**.
3. You must be on **Application** (C1), not AI interview. Copy top-bar `OIA-5302-…` (Application ID).
4. **New tab**, same URL. **HR / Recruiter portal** → **Continue to MFA** → tap code → **Verify and enter portal**. Confirm the same Application ID. Do **not** click **Load demo application**.
5. Tab H, sidebar **Job settings** (or H1 **Open job settings**). Set **Min answers before close** to `3` and **Max answers (hard stop)** to `5` (the inputs refuse values below 3 / 5 unless you force the DOM). On the first custom question, set Strong answer rubric to exactly `MUST cite OMR 4.2m`. **Save blueprint**. Expect flash `Interview blueprint saved — C4 will use this configuration.` Then **Back to review queues**.
6. Tab C, C1: under Demo samples click **Upload 01-sara-al-hinai-en.pdf · English electronic PDF** (do not use the OS file picker). **Confirm extraction** → **Confirm all fields** → **Continue to submit** → **Confirm & submit profile**.
7. C2: **Accept & continue to assessment**.
8. C3: for each of 4 MCQs click the **first radio**. **Submit exam** → **Continue to AI interview →**.
9. C4: blueprint card must show `MUST cite OMR 4.2m`. If the camera/mic prompt appears, **Allow**. **Start interview**. Wait until the avatar question is on screen (2D fallback is OK).
10. Click **Type instead**. Paste the C4 paragraph from §6. **Send typed answer**. Repeat until the page shows `Maximum 5 answers reached — submit to unlock scoring.` (or `Maximum 2` if you forced max=2). If the avatar stalls, click **Interrupt avatar** then type again. Then **Submit interview & view my score →**. Do **not** wait for a spoken conversation.
11. C5 score page visible. Sidebar **Application status** (C6) still pending HR.
12. Tab H: H3 interview review — transcript has your text; if a player exists, click a turn/evidence (seek is ③). Open DevTools Network before step 10 if you can: `follow-up` and `generate-assessment` POST bodies must contain `questionRubrics` and `MUST cite OMR 4.2m`.
13. H2: leave reason empty → Shortlist stays disabled. Type `Shortlist for P0 test` → **Shortlist candidate**.
14. H4: **Recommend hire** + reason `P0 agent hire` → confirm. Tab C C6 shows **Recommended for hire**.
15. H1 table: a weak pool row says **Below screening threshold**, not `Disqualified`.

**Separate short runs** (Reset demo first each time):

- ⑧ fail-closed: C1 OS-upload a file named `random-offer.pdf` (not sara/khalid/noor/scan) → error, no Sara name.
- ⑨ Khalid: Upload **02-khalid-al-balushi-en.docx** → Current role company `Oman Infrastructure Holdings`, title `Financial Reporting Analyst`, industry `Infrastructure holdings`, location `Muscat, Oman`.
- ④ thin narrative: max=5, answers `I did some finance work.` only → H3/C5 must not “recommend hire” / praise competence.

**③ recording:** if you could not Allow camera/mic, mark **blocked**, check audit for `Session recording unavailable`. Do not fail the whole P0 for that alone.

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
| 5 | Sidebar **Job settings** (or H1 **Open job settings**) → edit one custom question + its Strong answer rubric to a unique phrase (e.g. `MUST cite OMR 4.2m`) → **Save blueprint** | Flash: `Interview blueprint saved — C4 will use this configuration.` |
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

1. Sidebar **Job settings** (or H1 **Open job settings**).
2. Change: custom question text, **Strong answer** rubric, min/max answers, follow-up dimensions, prohibited topics.
3. **Save blueprint**.
4. Tab C C4: blueprint card lists the same questions, rubrics, dimensions.

Network / model chain (this was the remaining gap; must re-verify):

1. DevTools filter `follow-up` and `generate-assessment`.
2. Follow-up POST JSON must include `interviewConfig.questionRubrics` (array of `{ questionId, textEn, strongAnswerRubric }`).
3. After interview submit, C5 and/or H3 `generate-assessment` POST must include the same `interviewConfig`.
4. Optional: set a rubric `MUST mention liquidity coverage ratio`. Give a thin answer that does not mention it. Follow-up should probe that gap; assessment rationale should not claim the criterion was met.

**Fail if:** rubric is visible in C4 but absent from those request bodies, or assessment ignores an unmet rubric with a hire-leaning sentence while scores are low.

Hard-stop helper for later: the Max answers input HTML min is **5**. Type `5` for a shorter run, or force the DOM to `2` if your tool allows it. Then use ⑤.

### ③ Real recording + playback

- Allow camera + microphone **before** Start interview.
- Complete at least two candidate answers, then **Submit interview**.
- H3: video (or audio) replay exists for this `applicationId`. Caption should say it loaded from the API server.
- Click a dimension evidence quote / turn → player seeks near that fragment (timestamped transcript).
- Network: after C4 submit, `POST /api/interview-recordings/<Application ID>` returns 200. On H3, `GET` the same path returns video bytes (not 404).
- IndexedDB `oia-recruitment-demo-v1` may still cache a copy on the recording browser; HR on another machine must use the server file.

**Blocked (not a product fail) if:** permission was denied. Then check audit for `Session recording unavailable`. Re-run with permission granted. Silent no-blob + no audit = fail.

### ④ Recommendation does not contradict scores

- On H3/C5, if interview/overall scores are low, LLM blurb must **not** praise / recommend hire.
- Look for a line like `Deterministic scores are authoritative…`.
- High score must not be overwritten by a “reject / weak” narrative.

Use a thin-answer take (one-liners) vs the Sara script in `docs/demo-5302/c4-interview-test-script.md`.

### ⑤ Interview hard stop

Default copy after 10 answers:  
`Maximum 10 answers reached — submit to unlock scoring.`

Faster: blueprint **max answers = 5** (UI floor), then the banner uses that number. Further Send typed answer is blocked. **Submit interview** still works and sets `interviewCompleted` even if avatar/TTS is unhappy. C5 and C6 unlock.

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
| 3 | H | Job settings | Unique rubric + optional max=5 → Save blueprint → Back to review queues |
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
| Server recording | Render free disk is ephemeral across deploys; a recording made before a Render rebuild may 404 until you record again. |
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