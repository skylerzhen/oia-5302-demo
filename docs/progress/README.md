# 项目进度同步（代码 + 对话）

Git 同步的不只是代码，还包括 **Cursor 对话里产生的进度、决策、待办**。

## 两层结构

| 层级 | 路径 | 谁写 | 内容 |
|------|------|------|------|
| **原始索引** | `cursor-transcript-index.md` | 脚本自动生成 | 按日期列出用户每条提问（从本地 jsonl 提取） |
| **决策摘要** | `../daily-logs/YYYY-MM-DD.md` 里的 `## Cursor 对话摘要` | 收工时 Agent 写 | 结论、决定、阻塞、明日延续项 |

原始 Cursor 聊天记录在 `~/.cursor/projects/.../agent-transcripts/`，**不进 Git**（体积大、可能含敏感信息）。进 Git 的是 **摘要**。

## 生成对话索引

```bash
npm run progress:sync
# 或
node scripts/sync-conversation-progress.mjs
```

## 收工流程（完整）

1. `npm run progress:sync` — 更新对话索引
2. Agent 读索引 + 当天 git diff + 会话记忆
3. 写 `docs/daily-logs/YYYY-MM-DD.md`（含 **Cursor 对话摘要**）
4. commit + push

你对 Cursor 说 **「收工」** 时，Agent 会自动执行以上步骤。

## 三台电脑

- **代码 + 日志 + 对话摘要**：`git pull`
- **继续同一对话上下文**：Cursor 云端/本地 chat 不跨机；靠 daily log 和本目录摘要衔接

## 历史回填

`conversation-history.md` 为 OIA 5302 项目 8/12–8/15 对话里程碑摘要（人工整理 + 索引对照）。
