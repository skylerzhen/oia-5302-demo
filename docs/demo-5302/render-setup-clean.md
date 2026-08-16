# Render 干净接入指南（OpenAI LLM + TTS）

> 前端 Surge：`https://oia-rfq-5302.surge.sh`  
> 后端 API：`https://oia-5302-demo.onrender.com`

Render **只跑 Node API**（`server/index.mjs`），不跑 VRoid / 前端 React。

---

## 方案 A：清空现有 Service 重新配（推荐）

1. 打开 [Render Dashboard](https://dashboard.render.com) → 进入 **oia-5302-demo**
2. **Settings → Environment** — 删掉所有旧变量，只保留下面 6 个：

| Key | Value |
|-----|-------|
| `LLM_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | `sk-...`（公司给的 key） |
| `OPENAI_TTS_VOICE` | `shimmer` |
| `OPENAI_TTS_MODEL` | `tts-1` |
| `LLM_MODEL` | `gpt-4o` |
| `LLM_MODEL_FAST` | `gpt-4o-mini` |

3. **Settings → Build & Deploy**

| 项 | 值 |
|----|-----|
| **Build Command** | `npm install --omit=dev` |
| **Start Command** | `node server/index.mjs` |
| **Health Check Path** | `/api/local-ai/status` |

4. **Manual Deploy** → Deploy latest commit
5. 等状态变 **Live**（约 2–3 分钟）

---

## 方案 B：删了重建（最干净）

1. Dashboard → **oia-5302-demo** → Settings → **Delete Web Service**
2. **New → Web Service** → 连接 GitHub 仓库 `skylerzhen/oia-5302-demo`
3. 配置：

| 项 | 值 |
|----|-----|
| **Name** | `oia-5302-demo`（URL 才会是 `oia-5302-demo.onrender.com`） |
| **Region** | 离用户近的（Singapore / Frankfurt） |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm install --omit=dev` |
| **Start Command** | `node server/index.mjs` |
| **Instance type** | Free |

4. Environment Variables — 同方案 A 的 6 个
5. Create Web Service

---

## 验证（必须通过）

```bash
cd ~/Downloads/oia-5302-demo

# API 状态
curl -s https://oia-5302-demo.onrender.com/api/local-ai/status

# 应看到：
# "provider": "openai"
# "ttsProvider": "openai"

npm run verify:openai-tts:render
# 应看到：✅ OpenAI TTS is active.
```

---

## 部署 Surge 前端

API Live 之后：

```bash
cd ~/Downloads/oia-5302-demo
npm run build
npm run deploy:surge
```

打开 https://oia-rfq-5302.surge.sh → Candidate → C4 测面试语音。

---

## 不要配的（已移除）

- ~~`DEEPSEEK_API_KEY`~~
- ~~`AZURE_SPEECH_*`~~
- ~~Build Command: `echo "no build"`~~

---

## 故障排查

| 现象 | 原因 | 修复 |
|------|------|------|
| `Cannot find package 'microsoft-cognitiveservices...'` | 旧代码 + 没 npm install | push 最新 main + Build Command 改对 |
| `ttsProvider: browser` | 没 OPENAI_API_KEY 或旧代码 | 填 key + redeploy |
| `credit_balance_exhausted` | OpenAI 账户没额度 | 公司 billing 充值 |
| Surge 有字幕没声音 | API 未 Live | 先 verify render 通过 |
