# HeyGen digital human setup (C4 interview)

This demo keeps **OpenAI TTS** (`shimmer`) for voice quality. HeyGen only renders the **talking-head video** from that audio (`avatar-realtime` · `type: audio`).

If HeyGen is not configured, C4 falls back to the existing **2D PNG lip-sync** avatar.

## Architecture

```
Browser C4  →  POST /api/heygen/speak  →  OpenAI TTS (server)
                                      →  HeyGen avatar-realtime (audio)
                                      →  poll HLS URL
             ←  hls.js video playback in AvatarPanel
```

## Step 1 — HeyGen account & API key

1. Sign in at [app.heygen.com](https://app.heygen.com).
2. Open **Settings → API** ([direct link](https://app.heygen.com/settings?nav=API)).
3. Create an API key and copy it.

## Step 2 — Pick an avatar look ID

From the project root (with `HEYGEN_API_KEY` in `llm.env`):

```bash
npm run heygen:list-avatars
```

Copy one `id` from the list.

## Step 3 — Local `llm.env`

Add to `llm.env` (see `llm.env.example`):

```env
HEYGEN_API_KEY=your-key
HEYGEN_AVATAR_ID=your-look-id
```

Keep existing OpenAI keys — HeyGen speak route uses OpenAI TTS on the server.

Verify:

```bash
npm run verify:heygen          # config only
npm run verify:heygen -- --speak   # full lip-sync test (~30–45s)
```

Run the demo:

```bash
npm run dev
```

Open C4 → **Start interview**. Badge should show **HeyGen realtime** when configured.

## Step 4 — Render (cloud API)

In [Render dashboard](https://dashboard.render.com) → `oia-5302-demo` → **Environment**:

| Key | Value |
|-----|--------|
| `HEYGEN_API_KEY` | same as local |
| `HEYGEN_AVATAR_ID` | same look id |

Redeploy or wait for auto-deploy. Then:

```bash
npm run verify:heygen:render
npm run verify:heygen:render -- --speak
```

Surge frontend (`npm run deploy:surge`) does **not** need HeyGen keys — only the Render API.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Badge still says **Portrait 2D** | API status missing HeyGen keys; check Render env + `/api/local-ai/status` |
| Video never appears, audio plays | HeyGen failed → 2D fallback; check browser console + `npm run verify:heygen -- --speak` |
| `HeyGen request failed (404 · resource_not_found)` | Avatar Realtime **not enabled** on this API key yet, or wrong product tier. Run `npm run heygen:probe-realtime`. If all avatars fail → contact HeyGen support to enable **Avatar Realtime** on API wallet. |
| `credit_balance_exhausted` (OpenAI) | Recharge OpenAI API — HeyGen speak route needs OpenAI TTS first. |
| `HeyGen request failed (401)` | Invalid `HEYGEN_API_KEY` |
| `stream timed out` | Wrong `HEYGEN_AVATAR_ID` or avatar not available for realtime |

## Endpoints

- `GET /api/heygen/status` — `{ configured, avatarId, mode }`
- `POST /api/heygen/speak` — `{ text }` or `{ audioBase64, mimeType }` → `{ hlsUrl, streamId }`

Status is also exposed on `GET /api/local-ai/status` under `speech.avatarProvider` and `avatar`.
