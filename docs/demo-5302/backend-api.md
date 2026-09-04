# OIA 5302 — Backend API Integration Guide

**Audience:** UIS frontend team  
**Base contract:** `src/lib/localAi.ts` (request/response types)

---

## Connection

| Item | Value |
|------|-------|
| **API base URL** | `https://oia-5302-demo.onrender.com` |
| **Local development** | `http://127.0.0.1:8787` (`npm run dev`) |

```env
VITE_LLM_API_URL=https://oia-5302-demo.onrender.com
VITE_API_SECRET=<provided separately by integration lead>
```

The service exposes JSON HTTP endpoints only. Use `/api/local-ai/status` to verify connectivity (the site root returns 404).

---

## Authentication

All **POST** routes require a shared secret when configured on the server.

| Method | Usage |
|--------|--------|
| **Recommended** | `"apiKey": "<secret>"` in the JSON body |
| Alternative | `Authorization: Bearer <secret>` |
| Alternative | `X-Demo-Api-Key: <secret>` |

**GET** `/api/local-ai/status` (and other status routes) do not require authentication.

---

## Endpoints

| Capability | Method | Path |
|------------|--------|------|
| Health / capabilities | GET | `/api/local-ai/status` |
| CV parsing | POST | `/api/local-ai/ocr/parse-cv` |
| CV–job matching | POST | `/api/local-ai/llm/match-candidates` |
| Interview question | POST | `/api/local-ai/llm/generate-question` |
| Dynamic follow-up | POST | `/api/local-ai/llm/follow-up` |
| Interview assessment | POST | `/api/local-ai/llm/generate-assessment` |
| Text-to-speech (+ visemes) | POST | `/api/local-ai/tts/synthesize` |
| Speech-to-text | POST | `/api/local-ai/asr/transcribe` |
| Avatar session start | POST | `/api/liveavatar/session/start` |
| Avatar speak | POST | `/api/liveavatar/speak` |
| Avatar session stop | POST | `/api/liveavatar/session/stop` |

- **Content-Type:** `application/json`
- **CORS:** enabled for browser clients (`Access-Control-Allow-Origin: *`)
- **Rate limits:** per-IP caps on POST routes; HTTP 429 when exceeded

---

## Request / response summary

All POST bodies include `apiKey` when auth is enabled.

### `POST /api/local-ai/ocr/parse-cv`

**Body:** `fileName`, `sampleId?`, `documentText?`, `isScannedPdf?`  
**Returns:** `fields[]`, `skills`, `languages`, `workHistory` — each field has `status`: `parsed` | `review` | `missing`, plus `evidence` where applicable.

### `POST /api/local-ai/llm/match-candidates`

**Body:** `candidates: [{ candidateId, name, cvText }]`, `jobDescription?`  
**Returns:** `matches[]` with `totalScore`, `qualified`, `dimensions[]`, `improvementTips[]`.  
Rubric keys: `portfolio`, `risk`, `excel`, `experience`, `education`, `communication`.

### `POST /api/local-ai/llm/generate-question`

**Body:** `purpose?`, `candidateProfile?`, `interviewConfig?` (supports `fixedQuestionQueue`, `followUpDimensions`, `prohibitedTopics`)  
**Returns:** `{ text }`

### `POST /api/local-ai/llm/follow-up`

**Body:** `answer`, `priorTurns[]`, `candidateProfile?`, `interviewConfig?` (`minAnswers`, `maxAnswers`, `followUpDimensions`)  
**Returns:** `{ text, evidencePhrase, action: "follow_up" | "closing", targetDimension? }`  
Client timeout: **45s** recommended.

### `POST /api/local-ai/llm/generate-assessment`

**Body:** `turns[]`, `assessmentScore`, `matchScore`, `jobTitle?`  
**Returns:** `{ recommendation, dimensions[] }` with transcript-backed evidence per dimension.

### `POST /api/local-ai/tts/synthesize`

**Body:** `{ text }`  
**Returns:** `audioBase64`, `mimeType`, optional `visemeMarks[]` for lip-sync.

### `POST /api/local-ai/asr/transcribe`

**Body:** `{ transcript }` or `{ pcmBase64, sampleRate }`  
**Returns:** `{ transcript }`

### LiveAvatar (`/api/liveavatar/*`)

1. `POST session/start` → `{ sessionId, livekitUrl, livekitClientToken }` — connect client to LiveKit  
2. `POST speak` → `{ sessionId, text }` — avatar speech (timeout **90s** recommended)  
3. `POST session/stop` → `{ sessionId }`

Without LiveAvatar, use `tts/synthesize` plus a client-side avatar renderer.

---

## Interview flow (C4)

```
session/start → generate-question → speak → transcribe → follow-up (until closing) → generate-assessment → session/stop
```

---

## Portal scope

This API covers **AI services** (parsing, matching, interview dialogue, speech, avatar).  
**Portal concerns** — role-based UI, workflow state, audit log, Jadarah integration — are implemented in the frontend application layer unless extended in a future API release.

---

## Smoke test

```bash
curl https://oia-5302-demo.onrender.com/api/local-ai/status

curl -X POST https://oia-5302-demo.onrender.com/api/local-ai/tts/synthesize \
  -H 'Content-Type: application/json' \
  -d '{"apiKey":"YOUR_SECRET","text":"Hello"}'
```

**Repository:** https://github.com/skylerzhen/oia-5302-demo  
**Client reference:** `src/lib/localAi.ts`
