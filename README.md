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
| **TTS / ASR** | OpenAI TTS + 浏览器 ASR；Edge TTS 客户端回退 |
| **前端** | React + Vite → Surge；`VITE_LLM_API_URL` 指向 Render |
| **数据** | 合成受控 CV/JD/题库 only；无真实 PII |

> **不是「纯 2D mock」**：线上 Surge 构建注入 `VITE_LLM_API_URL` + `VITE_API_SECRET`，C4 默认走 **LiveAvatar 视频流**。2D 仅作降级/离线演示。

配置 LiveAvatar：[`docs/demo-5302/liveavatar-setup.md`](./docs/demo-5302/liveavatar-setup.md)

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

## 原型覆盖（S0–S8）

| Step | Capability |
|------|------------|
| S0 | Offline mode banner（模拟 egress 关闭） |
| S1 | CV 上传/进度可视化、双栏 review（PDF·HTML 预览 + Evidence 定位原文）、确认提交 |
| S2 | CV v2 diff（experience + certification） |
| S3 | 匹配 dashboard + 证据链 + CSV |
| S4 | Shortlist / disqualify + 必填理由 |
| S5 | 双语 MCQ + 四项 KPI |
| S6 | **LiveAvatar** 自适应面试（5–10 题，LLM 决定 closing）+ 单路径 avatar controller |
| S7 | 评估报告 + improvement tips |
| S8 | HR 终审 + 全量 audit；H4 **加权** CV/测评/面试 composite |

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
| [docs/demo-5302/cloud-demo-deploy.md](./docs/demo-5302/cloud-demo-deploy.md) | Surge + Render 部署 |
| [deliverables/demo-5302/](./deliverables/demo-5302/) | Gate 证据模板 |
| [data/issue-5302-inputs/](./data/issue-5302-inputs/) | 合成受控输入 |
| [docs/demo-5302/](./docs/demo-5302/) | Gate checklist |

## 注意事项

- Jadarah / OIA SSO 均为 **模拟** 标签，无 live 政府 API
- **线上 Demo** 使用 Render LLM + LiveAvatar；**离线模式** 才强制 2D + adapter fallback
- Surge 免费版 **不托管 PDF**；Open source 链接使用 HTML + 应用内弹窗
- 合成数据 only；无真实候选人 PII
- 勿提交 `llm.env` / `llm.env.bak`（含 API 密钥）

## 版本发布

```bash
# 更新 VERSION + CHANGELOG 后
git tag -a v0.3.0 -m "release notes"
git push origin v0.3.0
```

## License

Private / RFQ demo — 仅供 OIA 5302 项目内部使用。
