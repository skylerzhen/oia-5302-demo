# 每日工作日志

本目录记录 OIA RFQ 5302 项目每天的工作内容，供三台电脑 + Cursor 跨机同步时查阅。

## 怎么用

**你只需要每天对 Cursor 说一个字：**

> **收工**

AI 会自动：**同步对话索引** → 写 markdown 日志（含 **Cursor 对话摘要**）→ commit → push GitHub。  
另外两台电脑 `git pull` 即可恢复代码 **和** 进度上下文。

也可说：「写日志」「今天结束了」「daily log」

详见 [docs/progress/README.md](../progress/README.md)

### 手动备用（AI 已写日志后）

```bash
./scripts/end-of-day.sh
```

## 文件命名

```
docs/daily-logs/2026-08-15.md
```

## 日志模板

复制下面结构给 AI，或让 AI 自动按此格式写：

```markdown
# YYYY-MM-DD 工作日志

## 今日目标

## 完成事项

## 代码 / 文档变更

## 遇到的问题与解决

## 明日计划

## 备注（演示 / 客户 / 风险）
```

## 索引

| 日期 | 摘要 |
|------|------|
| [2026-08-12](./2026-08-12.md) | 读标书、启动原型、双 Portal 重构 |
| [2026-08-13](./2026-08-13.md) | S1–S8 功能完善、离线 demo、数据包 |
| [2026-08-14](./2026-08-14.md) | CV 上传修复、Surge 部署、PDF/HTML 资料链接 |
| [2026-08-15](./2026-08-15.md) | Landing 修复、GitHub 仓库与同步体系 |
| [2026-08-17](./2026-08-17.md) | LiveAvatar C4 重写、C1 certification 修复、v0.2.0 发布 |
| [2026-08-18](./2026-08-18.md) | HR 门户增强、coolai 域名部署、LiveAvatar 部署/回退 stabilisation |
| [2026-08-19](./2026-08-19.md) | UIS C1 对齐、uiscloud.cc 域名、v0.3.0、Simi 对接 |
| [2026-08-23](./2026-08-23.md) | 全站 navy UI 统一、进度/对话同步 Git |
