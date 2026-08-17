# LiveAvatar Lite Mode (BYO OpenAI TTS)

Use this when HeyGen **Avatar Realtime** returns `404 resource_not_found`. LiveAvatar is a separate product at [app.liveavatar.com](https://app.liveavatar.com) with its own API key and credits.

## Architecture

```
OpenAI LLM (unchanged)
OpenAI TTS shimmer → PCM 24 kHz (server)
  → LiveAvatar WebSocket agent.speak
  → LiveKit WebRTC video (browser)
```

2D portrait remains the fallback when LiveAvatar is not configured.

## Setup

1. Sign up at [app.liveavatar.com](https://app.liveavatar.com) and buy LiveAvatar credits (not HeyGen wallet).
2. Copy API key from LiveAvatar dashboard.
3. List public avatars and pick a UUID:

```bash
npm run liveavatar:list-avatars
```

4. Add to `llm.env`:

```env
LIVEAVATAR_API_KEY=your-liveavatar-key
LIVEAVATAR_AVATAR_ID=uuid-from-list-avatars
```

5. Verify locally (starts session, OpenAI PCM TTS, speak, stop):

```bash
npm run verify:liveavatar
```

6. Run dev with API:

```bash
npm run dev
```

Enter **Candidate → C4**. Badge should read **LiveAvatar Lite** when configured.

## Render deploy

Add env vars in Render (see `render.yaml`):

- `LIVEAVATAR_API_KEY`
- `LIVEAVATAR_AVATAR_ID`

Redeploy API after setting keys. Surge frontend uses `VITE_LLM_API_URL` pointing at Render.

Remote verify:

```bash
npm run verify:liveavatar:render
```

## Cost notes

- OpenAI TTS: per character (same as before).
- LiveAvatar Lite: billed by LiveAvatar session/speak usage — check [LiveAvatar pricing](https://www.liveavatar.com/pricing).
- Server rate limits apply to `/api/liveavatar/*` routes.
- **API protection:** set `API_SECRET` on Render; use the same value as `VITE_API_SECRET` when building Surge (`npm run deploy:surge`). All billable `POST` routes require `Authorization: Bearer <secret>`.

## API routes

| Route | Purpose |
|-------|---------|
| `GET /api/liveavatar/status` | Config check |
| `POST /api/liveavatar/session/start` | Token + LiveKit creds + server WS |
| `POST /api/liveavatar/speak` | OpenAI PCM → avatar lip-sync |
| `POST /api/liveavatar/session/stop` | Close WS session |

Docs: [LiveAvatar Lite overview](https://docs.liveavatar.com/docs/lite-mode/overview)
