# v3 云端 Demo 架构（UIS / OIA 可访问）

v3 任务文档要求：**Demo 阶段走云端 API**；生产交付才全 on-prem（阿曼本地）。

```
UIS / OIA 浏览器
       ↓
https://oia-rfq-5302.surge.sh        ← 前端（Surge 静态站）
       ↓  HTTPS
https://<你的-cloud-api>/api/local-ai/...   ← LLM 后端（Render / Railway 等）
       ↓
DeepSeek / OpenAI API（当前默认 **OpenAI**：LLM + TTS）
```

Surge **只托管前端**；LLM **必须部署在云端 Node 服务**。这是 v3 设计，不是 Surge 的 bug。

---

## 一、部署 LLM API 到 Render（推荐，免费档可测）

1. 把仓库推到 GitHub（UIS 可只读 access）
2. 登录 [render.com](https://render.com) → **New → Web Service**
3. 连接 `oia-5302-demo` 仓库
4. 配置：

| 项 | 值 |
|----|-----|
| **Build Command** | `echo "no build"` |
| **Start Command** | `node server/index.mjs` |
| **Environment** | Node |

5. **Environment Variables**（在 Render 面板填，不要写进代码）：

```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_TTS_VOICE=shimmer
OPENAI_TTS_MODEL=tts-1
LLM_MODEL=gpt-4o
LLM_MODEL_FAST=gpt-4o-mini
LLM_API_PORT=10000
```

验证 OpenAI LLM + TTS 已生效：

```bash
curl -s https://<你的-render-url>/api/local-ai/status
npm run verify:openai-tts:render
```

应看到 `"provider":"openai"`, `"ttsProvider":"openai"`。

**Azure Speech（可选 — 口型 viseme + ASR，会覆盖 OpenAI TTS）：**

```
AZURE_SPEECH_KEY=<Speech 资源 Key 1>
AZURE_SPEECH_REGION=uaenorth
AZURE_SPEECH_VOICE_EN=en-US-JennyNeural
AZURE_SPEECH_VOICE_AR=ar-OM-AyshaNeural
```

验证 Azure 已生效：

```bash
curl -s https://<你的-render-url>/api/local-ai/status | jq .speech
```

应看到 `"ttsProvider":"azure"`, `"asrProvider":"azure"`, `"visemeSource":"azure-sdk"`。

> Render 会注入 `PORT`；若需兼容可把 `server/index.mjs` 的端口改为 `process.env.PORT ?? process.env.LLM_API_PORT ?? 8787`

6. Deploy 完成后得到 URL，例如：`https://oia-5302-llm.onrender.com`

7. 验证：

```bash
curl https://oia-5302-llm.onrender.com/api/local-ai/status
```

应返回 `"llm": true`。

---

## 二、前端 Surge 指向云端 API

构建时传入 API 地址（写入前端 bundle）：

```bash
VITE_LLM_API_URL=https://oia-5302-llm.onrender.com npm run build
npm run deploy:surge
```

或一步：

```bash
npm run deploy:surge:cloud -- https://oia-5302-llm.onrender.com
```

UIS 打开 https://oia-rfq-5302.surge.sh 即可用 LLM，**无需在本机装 Node**。

---

## 三、发给 UIS 的材料

| 交付物 | 说明 |
|--------|------|
| Demo 链接 | `https://oia-rfq-5302.surge.sh` |
| **Backend API 文档** | [`docs/demo-5302/backend-api.md`](./backend-api.md) — endpoints, auth, payloads for UIS frontend |
| 云端 API 说明 | 「Demo 使用云端 LLM API；生产按技术方案阿曼 on-prem 部署」 |
| 可选：仓库只读 | 供 UIS 技术同事复现 |

**口径（Masuod / UIS 邮件一致）：**

> Demo leverages cloud APIs for live showcasing. Production delivery is fully on-prem in Oman per our submitted technical proposal.

---

## 四、本地开发（仅你们自己改代码时用）

```bash
cp llm.env.example llm.env   # 填 OPENAI_API_KEY
npm run dev                    # Vite proxy → localhost:8787
```

本地 **不设置** `VITE_LLM_API_URL`，走 proxy 即可。

---

## 五、Azure Speech 部署清单（TTS 口型 + ASR）

### A. Azure Portal（一次性）

1. [Azure Portal](https://portal.azure.com) → **Create a resource** → **Speech**
2. 区域选 **UAE North (`uaenorth`)** 或离阿曼最近的区域
3. 定价层：**Free F0** 足够 demo（每月有限额）
4. 创建后 → **Keys and Endpoint** → 复制 **Key 1** 和 **Region**

### B. 本地 `llm.env`（开发验证）

```bash
# 追加到 llm.env（不要提交 git）
AZURE_SPEECH_KEY=<Key 1>
AZURE_SPEECH_REGION=uaenorth
AZURE_SPEECH_VOICE_EN=en-US-JennyNeural
AZURE_SPEECH_VOICE_AR=ar-OM-AyshaNeural
```

验证：

```bash
npm run dev:api          # 或 node server/index.mjs
npm run verify:azure     # 应显示 ttsProvider: azure, visemeSource: azure-sdk
```

### C. Render 环境变量

在 [Render Dashboard](https://dashboard.render.com) → **oia-5302-demo**（或 llm-api 服务）→ **Environment**：

| Key | Value |
|-----|--------|
| `AZURE_SPEECH_KEY` | Key 1（Secret） |
| `AZURE_SPEECH_REGION` | `uaenorth` |
| `AZURE_SPEECH_VOICE_EN` | `en-US-JennyNeural` |
| `AZURE_SPEECH_VOICE_AR` | `ar-OM-AyshaNeural` |

保存后 **Manual Deploy** 或等自动 redeploy。

验证：

```bash
npm run verify:azure:render
# 或
curl -s https://oia-5302-demo.onrender.com/api/local-ai/status | jq .speech
```

成功标志：`"ttsProvider":"azure"`, `"asrProvider":"azure"`, `"visemeSource":"azure-sdk"`

### D. Surge 前端

Azure 走 API，前端无需改 env（仍指向 Render）：

```bash
npm run deploy:surge:cloud -- https://oia-5302-demo.onrender.com
```

C4 页眉应显示：`TTS: azure · ASR: azure · Lip-sync: azure-sdk`

---

## 六、后续：语音 + 口型（已合并到第五节）

同一云端 API 已支持（配置 `AZURE_SPEECH_*` 后自动启用）：

- `POST /api/local-ai/tts/synthesize` — Azure TTS + **Speech SDK viseme 事件**（口型时间轴）
- `POST /api/local-ai/asr/transcribe` — Azure ASR（`pcmBase64` 16 kHz mono）或 browser 回退

C4 页眉显示 `TTS: azure · ASR: azure · Lip-sync: azure-sdk` 即配置成功。

前端仍通过 `VITE_LLM_API_URL` 调用，UIS 无需改配置。
