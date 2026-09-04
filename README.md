# OIA RFQ 5302 — AI Recruitment Demo

Vertical-slice prototype for the evaluation demo journey (**S0–S8**).

| | |
|---|---|
| **在线 Demo（主）** | https://oia-recruitment.uiscloud.cc |
| **在线 Demo（备）** | https://oia-rfq-5302.surge.sh |
| **Cloud API** | https://oia-5302-demo.onrender.com |
| **版本** | 见 [`VERSION`](./VERSION) · 变更见 [`CHANGELOG.md`](./CHANGELOG.md) |
| **Owner** | skylerz |
| **Deadline 参考** | Issue ~8/17 · Go/No-Go ~8/16 |

## 技术栈（当前）

| 层 | 实现 |
|----|------|
| **Avatar 面试（C4）** | **LiveAvatar Lite** — LiveKit 真人视频 + OpenAI TTS（`onyx`）口型同步；Render API 托管 session/speak |
| **Avatar 备选** | HeyGen Avatar Realtime（若配置 `HEYGEN_*`） |
| **Avatar 回退** | 2D 卡通面试官 — 仅当云端未配置 LiveAvatar/HeyGen，或离线 `npm run demo:offline` |
| **LLM** | OpenAI（CV 解析、自适应 follow-up、评估、匹配）— 无 key 时用 adapter fallback |
| **C4 面试** | **自由麦 full-duplex**（浏览器 ASR 常开 + barge-in）+ HR 可配置固定题 / JD 题集 |
| **HR 配置** | H1 **Interview setup** — 自定义问题 + JD 六维题集 → C4 orchestrator 按序出题 |
| **TTS / ASR** | OpenAI TTS + 浏览器 ASR；Edge TTS 客户端回退 |
| **前端** | React + Vite → Surge；`VITE_LLM_API_URL` 指向 Render |
| **数据** | 合成受控 CV/JD/题库 only；无真实 PII |

> **不是「纯 2D mock」**：线上 Surge 构建注入 `VITE_LLM_API_URL` + `VITE_API_SECRET`，C4 默认走 **LiveAvatar 视频流**。2D 仅作降级/离线演示。

配置 LiveAvatar：[`docs/demo-5302/liveavatar-setup.md`](./docs/demo-5302/liveavatar-setup.md)  
**UIS 前端对接后端 API：** [`docs/demo-5302/backend-api.md`](./docs/demo-5302/backend-api.md)  
API 额度防护（rate limit、prefetch 限流）：[`docs/demo-5302/api-cost-guards.md`](./docs/demo-5302/api-cost-guards.md)

## 快速开始

```bash
git clone git@github.com:skylerzhen/oia-5302-demo.git
cd oia-5302-demo
npm install
cp llm.env.example llm.env   # 填 OPENAI + LIVEAVATAR（云端 demo 可选本地 llm.env）
npm run dev                    # http://localhost:5173 + 本地 API :8787
```

**Surge 部署（必须带 API URL，否则 Avatar 会降级 2D）：**

```bash
npm run deploy:surge
# 或指定域名
node scripts/deploy-surge-cloud.mjs https://oia-5302-demo.onrender.com oia-recruitment.uiscloud.cc
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发（Vite + LLM API） |
| `npm run build` | 生产构建（含 controlled HTML 生成） |
| `npm run demo:offline` | 离线 Issue 演示（127.0.0.1:4173，2D + mock AI） |
| `npm run deploy:surge` | 构建并部署到 Surge（注入 `VITE_LLM_API_URL`） |
| `npm run demo:documents:publish` | 重新生成受控 PDF/HTML 到 `public/` |
| `npm run verify:liveavatar` | 验证 LiveAvatar session + speak 链路 |
| `npm run verify:liveavatar:render` | 对 Render 生产 API 做 LiveAvatar 健康检查 |

## 原型覆盖（S0–S8）

| Step | Capability |
|------|------------|
| S0 | Offline mode banner（模拟 egress 关闭） |
| S1 | CV 上传/进度可视化、双栏 review（PDF·HTML 预览 + Evidence 定位原文）、确认提交 |
| S2 | CV v2 diff（experience + certification） |
| S3 | 匹配 dashboard + **JD 六维可调权重** + 证据链 + CSV；**Interview setup**（HR 配题） |
| S4 | Shortlist / disqualify + 必填理由 |
| S5 | 双语 MCQ + 四项 KPI |
| S6 | **LiveAvatar** 自适应面试（HR 固定题 → JD 题 → LLM follow-up，5–10 轮）+ **自由麦 duplex** |
| S7 | 评估报告 + improvement tips；H3 录像回放（HR 专用文案） |
| S8 | HR 终审 + 全量 audit；H4 **加权** CV/测评/面试 composite（**H1–H4 CV 分统一由维度计算**） |

## 三台电脑 + Cursor 同步

详见 **[docs/cursor-sync/README.md](./docs/cursor-sync/README.md)**

```bash
# 每天开始
git pull origin main

# 每天结束（对 Cursor 说「收工」）→ review → push
git add docs/daily-logs/ CHANGELOG.md
git commit -m "docs: daily log YYYY-MM-DD"
git push origin main
```

## 每日工作日志

- 目录：[docs/daily-logs/](./docs/daily-logs/)
- **收工时对 Cursor 说「收工」** — AI 自动写日志 + commit + push
- 索引：[docs/daily-logs/README.md](./docs/daily-logs/README.md)

## 文档索引

| 路径 | 内容 |
|------|------|
| [WIN-HANDOFF.md](./WIN-HANDOFF.md) | Windows 正式版交接 |
| [OIA-Demo-Narration-Script.md](./OIA-Demo-Narration-Script.md) | 旁白脚本 |
| [docs/demo-5302/liveavatar-setup.md](./docs/demo-5302/liveavatar-setup.md) | LiveAvatar Lite 配置 |
| [docs/demo-5302/api-cost-guards.md](./docs/demo-5302/api-cost-guards.md) | OpenAI / API 额度防护与事故记录 |
| [docs/demo-5302/cloud-demo-deploy.md](./docs/demo-5302/cloud-demo-deploy.md) | Surge + Render 部署 |
| [deliverables/demo-5302/](./deliverables/demo-5302/) | Gate 证据模板 |
| [data/issue-5302-inputs/](./data/issue-5302-inputs/) | 合成受控输入 |
| [docs/demo-5302/](./docs/demo-5302/) | Gate checklist |

## 注意事项

- Jadarah / OIA SSO 均为 **模拟** 标签，无 live 政府 API
- **线上 Demo** 使用 Render LLM + LiveAvatar；**离线模式** 才强制 2D + adapter fallback
- Render 部署需设 `API_SECRET`（与 Surge 构建 `VITE_API_SECRET` 相同）；见 `llm.env.example`
- Surge 免费版 **不托管 PDF**；Open source 链接使用 HTML + 应用内弹窗
- 合成数据 only；无真实候选人 PII
- 勿提交 `llm.env` / `llm.env.bak`（含 API 密钥）

## 版本发布

**单一真相源：** 根目录 [`VERSION`](./VERSION) = [`package.json`](./package.json) `version` = Git tag（如 `v0.4.0`）。  
每次 **minor 功能里程碑** 或 **收工发布** 应同时更新：`VERSION` + `package.json` + `CHANGELOG.md`（新建 `[x.y.z]` 节）+ `git tag`.

```bash
# 示例：发布 0.4.0
# 1. 编辑 VERSION、package.json、CHANGELOG.md
git add VERSION package.json package-lock.json CHANGELOG.md
git commit -m "release: v0.4.0 — …"
git tag -a v0.4.0 -m "v0.4.0: …"
git push origin main --tags
```

## License

Private / RFQ demo — 仅供 OIA 5302 项目内部使用。
