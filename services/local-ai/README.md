# OIA 5302 Local AI Adapter Contract

The browser calls same-origin relative endpoints only.

## Demo v3 (8/17)

For the evaluation demo, run the cloud LLM API locally:

```bash
cp llm.env.example llm.env   # then edit llm.env in the sidebar
npm run dev
```

Provider switch (no code change):

```bash
# OpenAI (default — LLM + TTS)
LLM_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_TTS_VOICE=shimmer
LLM_MODEL=gpt-4o
LLM_MODEL_FAST=gpt-4o-mini

# DeepSeek (legacy fallback)
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=...
```

Routes:

| Route | Purpose |
|---|---|
| `GET /api/local-ai/status` | LLM availability + provider |
| `POST /api/local-ai/ocr/parse-cv` | CV → structured fields |
| `POST /api/local-ai/llm/generate-question` | Opening / Arabic question |
| `POST /api/local-ai/llm/follow-up` | Answer-aware follow-up |
| `POST /api/local-ai/llm/generate-assessment` | H3 evaluation report |

Voice (ASR/TTS/viseme) routes are defined in the frontend but not yet implemented.

## Production target

Bind services to localhost or the air-gapped private network only. Do not expose API keys in the browser bundle.
