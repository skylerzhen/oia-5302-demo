# OIA RFQ 5302 — AI Recruitment Demo

Vertical-slice prototype for the evaluation demo journey (**S0–S8**).

| | |
|---|---|
| **在线 Demo** | https://oia-rfq-5302.surge.sh |
| **版本** | 见 [`VERSION`](./VERSION) · 变更见 [`CHANGELOG.md`](./CHANGELOG.md) |
| **Owner** | skylerz |
| **Deadline 参考** | Issue ~8/17 · Go/No-Go ~8/16 |

## 快速开始

```bash
git clone git@github.com:YOUR_USERNAME/oia-5302-demo.git
cd oia-5302-demo
npm install
npm run dev          # http://localhost:5173
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建（含 controlled HTML 生成） |
| `npm run demo:offline` | 离线 Issue 演示（127.0.0.1:4173） |
| `npm run deploy:surge` | 部署到 Surge |
| `npm run demo:documents:publish` | 重新生成受控 PDF/HTML 到 `public/` |

## 原型覆盖（S0–S8）

| Step | Capability |
|------|------------|
| S0 | Offline mode banner（模拟 egress 关闭） |
| S1 | CV 上传向导、字段解析/复核、草稿与提交 |
| S2 | CV v2 diff（experience + certification） |
| S3 | 匹配 dashboard + 证据链 + CSV |
| S4 | Shortlist / disqualify + 必填理由 |
| S5 | 双语 MCQ + 四项 KPI |
| S6 | Avatar 面试 + mock 动态 follow-up |
| S7 | 评估报告 + improvement tips |
| S8 | HR 终审 + 全量 audit |

## 三台电脑 + Cursor 同步

详见 **[docs/cursor-sync/README.md](./docs/cursor-sync/README.md)**

```bash
# 每天开始
git pull origin main

# 每天结束（对 Cursor 说「写今天的工作日志」）→ review → push
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
| [deliverables/demo-5302/](./deliverables/demo-5302/) | Gate 证据模板 |
| [data/issue-5302-inputs/](./data/issue-5302-inputs/) | 合成受控输入 |
| [docs/demo-5302/](./docs/demo-5302/) | Gate checklist |

## 注意事项

- Jadarah / OIA SSO 均为 **模拟** 标签，无 live API
- Avatar 为 **2D / mock** — 非生产 ASR/TTS
- Surge 免费版 **不托管 PDF**；Open source 链接使用 HTML + 应用内弹窗
- 合成数据 only；无真实候选人 PII

## 版本发布

```bash
# 更新 VERSION + CHANGELOG 后
git tag -a v0.1.0 -m "release notes"
git push origin v0.1.0
```

## License

Private / RFQ demo — 仅供 OIA 5302 项目内部使用。
