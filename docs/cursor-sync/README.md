# 三台电脑 Cursor 同步指南

Owner: **skylerz** · 项目: **OIA RFQ 5302 Demo**

## 原则

| 同步方式 | 内容 |
|----------|------|
| **GitHub 仓库**（推荐） | 代码、文档、每日日志、项目 Cursor 规则 |
| **Cursor 账号** | Cloud Agents、部分设置（登录同一 Cursor 账号） |
| **不要进 Git** | `node_modules/`、`dist/`、密钥、`.env` |

## 第一次：Mac A（当前这台）

```bash
# 1. 登录 GitHub CLI（只需一次）
gh auth login

# 2. 进入项目
cd /path/to/oia-5302-demo

# 3. 若远程尚未创建（首次）
gh repo create oia-5302-demo --private --source=. --remote=origin --push

# 4. 若远程已存在
git remote add origin git@github.com:YOUR_USERNAME/oia-5302-demo.git
git push -u origin main
git push origin v0.1.0
```

## Mac B / Mac C（另外两台）

```bash
# SSH 方式（推荐）
git clone git@github.com:YOUR_USERNAME/oia-5302-demo.git
cd oia-5302-demo
npm install

# 或 HTTPS
git clone https://github.com/YOUR_USERNAME/oia-5302-demo.git
```

在 Cursor：**File → Open Folder** → 选 clone 下来的目录。

## 每天工作流

**收工时对 Cursor 说「收工」** — AI 自动写日志、commit、push。

```bash
# 开始一天
git pull origin main

# ... 在 Cursor 里开发 ...

# 收工：对 Cursor 说「收工」
# 或手动：./scripts/end-of-day.sh
```

另一台电脑：

```bash
git pull origin main
```

## Cursor 项目规则同步

本仓库已包含：

```
.cursor/rules/oia-5302-project.mdc
.cursor/rules/daily-log-workflow.mdc   ← 收工自动流程
```

三台电脑 **clone 同一仓库** 后，Cursor 会自动读取项目内规则（与全局 `~/.cursor/rules` 互补）。

### 全局 Skills / 用户规则

位于 `~/.cursor/skills-cursor/` 和 Cursor Settings → Rules，**不在本仓库**。

若要在三机保持一致，可以：

1. 手动复制 `~/.cursor/skills-cursor/` 到 U 盘 / iCloud；或
2. 另建私有 repo `cursor-dotfiles` 只放你的 skills 和 rules（可选）

## 版本管理

- 当前版本见根目录 **`VERSION`**（SemVer）
- 变更记录见 **`CHANGELOG.md`**
- 发版打 tag：

```bash
# 更新 VERSION + CHANGELOG 后
git tag -a v0.1.0 -m "S0-S8 prototype + Surge deploy"
git push origin v0.1.0
```

## 分支建议

| 分支 | 用途 |
|------|------|
| `main` | 稳定可演示版本 |
| `dev` | 日常开发（可选） |
| `feature/xxx` | 大功能（可选） |

Demo 冲刺阶段可直接在 `main` 上 commit；Go/No-Go 前打 tag。

## 常见问题

**Q: 三台 Cursor 聊天记录能同步吗？**  
A: 完整 chat 历史在 Cursor 本地/云端，**不会**自动进 Git。重要结论写进 `docs/daily-logs/`。

**Q: Surge 部署在哪台做？**  
A: 任意一台 `npm run deploy:surge` 即可；部署前建议 `git pull` 保持一致。

**Q: 冲突怎么办？**  
A: 尽量不同机同时改同一文件；冲突时 `git pull` → 解决冲突 → `commit` → `push`。

## 每日日志命令（对 Cursor 说）

> **收工**

（也可以说：写日志、今天结束了、daily log）
