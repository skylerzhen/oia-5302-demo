# API cost guards (OIA 5302 demo)

Prevent runaway OpenAI / HeyGen spend from frontend bugs or public API abuse.

## Incident (2026-08-16)

HR portal `useEffect` depended on unstable `log` function → infinite `matchCandidates` (gpt-4o) loop → ~$250 org spend overnight.

## Frontend guards

| Guard | Location |
|-------|----------|
| `log` / `syncIntegration` wrapped in `useCallback` | `src/App.tsx` |
| Never put `log` in `useEffect` deps | `HrPortal.tsx`, `CandidatePortal.tsx` |
| Stable `fieldsKey` instead of `fields` array ref | `profileFieldsKey.ts` |
| Match + assessment request cache / in-flight dedup | `llmRequestCache.ts` |
| `warmInterviewSpeech()` runs once per page load | `voiceSpeak.ts` |
| Single HeyGen attempt per speak line | `voiceSpeak.ts` |

## Server guards (Render API)

| Guard | Default |
|-------|---------|
| Global billable POST cap per IP | **90 / hour** (`LLM_GLOBAL_MAX_PER_HOUR`) |
| `match-candidates` | 4 / min |
| `parse-cv` | 8 / min |
| `generate-assessment` | 4 / min |
| `follow-up` | 24 / min |
| `tts/synthesize` | 20 / min |
| `heygen/speak` | 6 / min |

All LLM JSON handlers use **`gpt-4o-mini`** (not full gpt-4o).

## Ops checklist

1. OpenAI **monthly spending limit** (e.g. $50)
2. **Rotate API key** after public exposure
3. Redeploy **Render** after server guard changes
4. Monitor [OpenAI Usage](https://platform.openai.com/usage) — spikes on **Chat Completions**, not TTS

## Verify after deploy

```bash
npm run verify:openai-tts:render
# Hammer test (should 429 after limits):
for i in $(seq 1 10); do curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://oia-5302-demo.onrender.com/api/local-ai/llm/match-candidates \
  -H 'Content-Type: application/json' \
  -d '{"candidates":[{"candidateId":"x","name":"x","cvText":"x"}]}'; done
```

Expect `200` a few times then `429`.
