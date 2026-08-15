# Skylerz Cursor 工作区索引

GitHub 账号：**skylerzhen** · 三台电脑用 `git clone` / `git pull` 同步。

| 项目 | 本地路径 | GitHub 仓库 | 说明 |
|------|----------|-------------|------|
| OIA RFQ 5302 Demo | `~/Downloads/oia-5302-demo` | [oia-5302-demo](https://github.com/skylerzhen/oia-5302-demo) | 阿曼 OIA 招聘 AI 演示 S0–S8 |
| 华丰 AI 大脑 | `~/Projects/huafeng-ai-brain` | [huafeng-ai-brain](https://github.com/skylerzhen/huafeng-ai-brain) | 华丰可视化方案页 |
| 双木 AI 大脑 Demo | `~/Projects/shuangmu-ai-brain-demo` | [shuangmu-ai-brain-demo](https://github.com/skylerzhen/shuangmu-ai-brain-demo) | 双木能源对话 Demo |
| A7 录音 App | `~/Documents/GitHub/a7-ai-recorder` | [Codejoy-Lab/a7-ai-recorder](https://github.com/Codejoy-Lab/a7-ai-recorder) | 已在团队 org，非个人仓 |

## 为什么不是「一个仓装所有对话」？

1. **Cursor 按文件夹开项目** — 每个对话绑定一个 workspace 路径，Git 也是一项目一仓库最清晰。
2. **上次只在 5302 目录里执行了建仓** — Agent 默认只能提交当前打开的项目。
3. **Cursor 聊天记录不在 Git 里** — 对话在 `~/.cursor/projects/`，需靠 `docs/daily-logs/` 把结论写进仓库。
4. **A7 已有远程** — 指向 `Codejoy-Lab`，若要进个人账号需 fork 或改 remote。

## 每日收工

每个项目里对 Cursor 说 **「收工」** → markdown 日志 + push。

## 三台电脑首次 clone

```bash
git clone https://github.com/skylerzhen/oia-5302-demo.git ~/Downloads/oia-5302-demo
git clone https://github.com/skylerzhen/huafeng-ai-brain.git ~/Projects/huafeng-ai-brain
git clone https://github.com/skylerzhen/shuangmu-ai-brain-demo.git ~/Projects/shuangmu-ai-brain-demo
git clone https://github.com/Codejoy-Lab/a7-ai-recorder.git ~/Documents/GitHub/a7-ai-recorder
```
