# OIA 5302 — Cursor 对话历史摘要

> 里程碑摘要，供三台电脑 `git pull` 后快速恢复上下文。  
> 详细逐条提问见 [`cursor-transcript-index.md`](./cursor-transcript-index.md)（`npm run progress:sync` 自动生成）。

## 2026-08-12 · 读标 + 启动原型

- 解读 Technical Response v1.3、招标 Must 要求、鉴权/数据字典、demo_issue
- Leader 要求当天出原型 → 搭建 React/Vite demo
- 用户反馈：HR 与候选人不能同一流程 → **双 Portal** 重构
- Avatar：口型暂不做，换阿拉伯面试官静态图
- 修复 HR dashboard、面试卡住、无法进 HR 流程

**关键决定：** 先做可点击 vertical slice，Mock AI，合成数据。

## 2026-08-13 · S0–S8 + 离线 + 数据包

- 补齐 Candidate C1–C6、HR H1–H5 与步骤锁
- 离线 demo：CSP、egress guard、`npm run demo:offline`
- 合成数据包、handoff 文档、旁白脚本
- 3D Avatar 代码预留，**资产制作暂停**
- 用户明确：**视频合成不重要**

## 2026-08-14 · 线上修复 + 上传体验

- C1 上传改为分阶段真实感流程（非假一键）
- Surge PDF 404 → HTML 视图 + 应用内弹窗
- MakeHuman/VRoid 探索后 **暂停 3D**
- 为 Ella 准备中英文进度、OIA 英文确认清单

## 2026-08-15 · Landing + GitHub + 同步体系

- 修复：刷新应回 Landing，不要直接 Candidate login
- 建立 skylerzhen GitHub：oia-5302、huafeng、shuangmu
- **A7 为公司项目，不进个人 GitHub**
- 用户要求：同步 **项目进度** 而非仅代码 → 本目录 + 收工写对话摘要

## 2026-08-18 · HR + 域名 + LiveAvatar stabilisation

- HR 门户：候选人旅程、H2–H4 流程卡片、H4 评分总览
- 自定义域名 coolai.tech / uiscloud.cc 部署与 env 注入修复
- LiveAvatar FPS 实验回退；用户确认「可以了」
- v0.3.0 发布：UIS 双栏 C1 review

## 2026-08-19 · UIS 对齐 + 正式域名

- C1 对齐 Document Intelligence（双栏 review、Completeness、Re-parse）
- `uiscloud-oman/oia-demo-frontend` clone；确认无独立 CV 模块
- 正式域名 **https://oia-recruitment.uiscloud.cc**
- API/LLM/TTS/LiveAvatar 健康；C4 三轮追问测试稿
- 并行：华丰 AI 大脑大屏项目启动

## 未决 / 延续

- 8/16 Go/No-Go 排练证据（录像、arabic review）
- Surge 原生 PDF 需 `surge card` whitelist（可选）
- Win 正式版 handoff 待 Ella 范围 sign-off

## 对话 ID（本机 Cursor）

- 主会话：`cfdf73c4-11d0-4c96-bce3-879ff2d3583a`（oia-5302-demo workspace）
