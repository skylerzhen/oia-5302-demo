# v3 云端 Demo 架构（UIS / OIA 可访问）

v3 任务文档要求：**Demo 阶段走云端 API**；生产交付才全 on-prem（阿曼本地）。

```
UIS / OIA 浏览器
       ↓
https://oia-rfq-5302.surge.sh        ← 前端（Surge 静态站）
       ↓  HTTPS
https://<你的-cloud-api>/api/local-ai/...   ← LLM 后端（Render / Railway 等）
       ↓
DeepSeek / OpenAI API
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
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...
LLM_MODEL=deepseek-chat
LLM_MODEL_FAST=deepseek-chat
LLM_API_PORT=10000
```

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
| 云端 API 说明 | 「Demo 使用云端 LLM API；生产按技术方案阿曼 on-prem 部署」 |
| 可选：仓库只读 | 供 UIS 技术同事复现 |

**口径（Masuod / UIS 邮件一致）：**

> Demo leverages cloud APIs for live showcasing. Production delivery is fully on-prem in Oman per our submitted technical proposal.

---

## 四、本地开发（仅你们自己改代码时用）

```bash
cp llm.env.example llm.env   # 填 DEEPSEEK_API_KEY
npm run dev                    # Vite proxy → localhost:8787
```

本地 **不设置** `VITE_LLM_API_URL`，走 proxy 即可。

---

## 五、后续：语音 + 口型

同一云端 API 服务后续追加：

- `POST /api/local-ai/tts/synthesize`（带 viseme）
- `POST /api/local-ai/asr/transcribe`

前端仍通过 `VITE_LLM_API_URL` 调用，UIS 无需改配置。
