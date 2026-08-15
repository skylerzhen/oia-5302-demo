# Skylerz Cursor 工作区索引

## 个人 GitHub（skylerzhen）— 三机 `git pull` 同步

| 项目 | 本地路径 | 仓库 |
|------|----------|------|
| OIA RFQ 5302 Demo | `~/Downloads/oia-5302-demo` | [oia-5302-demo](https://github.com/skylerzhen/oia-5302-demo) |
| 华丰 AI 大脑 | `~/Projects/huafeng-ai-brain` | [huafeng-ai-brain](https://github.com/skylerzhen/huafeng-ai-brain) |
| 双木 AI 大脑 Demo | `~/Projects/shuangmu-ai-brain-demo` | [shuangmu-ai-brain-demo](https://github.com/skylerzhen/shuangmu-ai-brain-demo) |

## 公司 GitHub（Codejoy-Lab）— 勿推到个人账号

| 项目 | 本地路径 | 仓库 |
|------|----------|------|
| A7 AI Recorder | `~/Documents/GitHub/a7-ai-recorder` | [Codejoy-Lab/a7-ai-recorder](https://github.com/Codejoy-Lab/a7-ai-recorder) |

A7 同步方式：公司仓开分支 / PR，另外两台 `git clone` 或 `git pull` **Codejoy-Lab** remote。

## 每日收工

- **个人项目**：对 Cursor 说 **「收工」** → 对话索引 + markdown 日志（含 **Cursor 对话摘要**）+ push `skylerzhen/*`
- **A7**：只 commit 到公司流程；**不要** push 到 `skylerzhen`

## 进度同步（代码 + 对话）

| 内容 | 路径 |
|------|------|
| 对话里程碑摘要 | `docs/progress/conversation-history.md` |
| 逐条提问索引（脚本生成） | `docs/progress/cursor-transcript-index.md` |
| 每日决策摘要 | `docs/daily-logs/YYYY-MM-DD.md` → `## Cursor 对话摘要` |

原始 Cursor jsonl **不进 Git**；`npm run progress:sync` 从本机提取提问列表。

## 未入库

- Cursor 原始 jsonl：`~/.cursor/projects/`（太大/可能含敏感信息）
- Downloads 大 zip 备份未提交（见 `docs/tender/README.md`）
