# OIA 5302 Local AI Adapter Contract

The browser calls same-origin relative endpoints only. This keeps the UI
compatible with the offline Content Security Policy and prevents cloud fallback.

The localhost delivery server currently provides explicit
`adapter-fallback` responses so the workflow remains reproducible before GPU
models are installed. Those responses are **not** a claim that OCR, LLM, ASR
or TTS models are running.

## Required replacement endpoints

| Route | Input | Required model behaviour |
|---|---|---|
| `POST /api/local-ai/ocr/parse-cv` | filename and scan flag | Local PDF/DOCX/image extraction, field confidence and evidence location |
| `POST /api/local-ai/llm/follow-up` | answer and language | Follow-up must quote or refer to the submitted answer |
| `POST /api/local-ai/asr/transcribe` | local audio reference | EN/AR transcript with timestamps |
| `POST /api/local-ai/tts/synthesize` | text and language | Return local speech output and phoneme timing |
| `GET /api/local-ai/status` | none | Declare `model` only when all approved local services are available |

## Integration rules

1. Bind the service to localhost or the air-gapped private network only.
2. Do not add a cloud fallback, remote telemetry, CDN model download or remote
   API key.
3. Preserve the JSON response shape implemented in `src/lib/localAi.ts`.
4. Return a `mode` of `model` only for a real approved local model invocation.
5. Save model logs and network-monitor output as Gate 1 evidence.

## Current browser flow

- C1 invokes OCR adapter after a controlled CV input is selected.
- C4 invokes LLM adapter after each candidate answer.
- ASR/TTS routes are defined but await local microphone and speech-model
  integration.
