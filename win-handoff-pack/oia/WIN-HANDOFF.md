# OIA RFQ 5302 — Windows 交接文档（给 Cursor Agent）

> **用途：** 在 Win 电脑上继续本项目「正式版」开发前，先读本文。这是 Mac 上多轮对话的完整上下文摘要。  
> **项目路径（Mac）：** `oia-5302-demo`  
> **用户：** skylerz · 软件工程师 · 偏好直接在代码里迭代

---

## 1. 项目是什么

**OIA RFQ 5302** 评标用 **AI 招聘助手 Demo**，目标是在 **8/17 前** 交付一场 **断网可跑、22–28 分钟、可点击走通** 的现场演示，证明投标方案里的五模型能力是真链路，不是 PPT。

当前仓库是 **可点击原型（vertical slice）**，不是生产系统：

- **双 Portal：** 候选人（Jadarah token）与 HR（OIA SSO + MFA）完全分离
- **离线面试段：** 顶栏网络灯模拟 Connected / Offline
- **双语：** UI 与面试 EN + AR
- **Human-in-the-loop：** AI 只建议，HR 必须填理由才能 shortlist / hire / reject
- **全链路审计：** 每步 action 写入 audit log

**线上 Demo：** https://oia-rfq-5302.surge.sh  
（Mac 上最后 build 成功；Win 上需 `npm run deploy:surge` 或自行部署）

---

## 2. 技术栈

| 层 | 选型 |
|----|------|
| 前端 | Vite 8 + React 19 + TypeScript |
| 样式 | 纯 CSS（`src/App.css`），无 Tailwind |
| 图标 | lucide-react |
| 状态 | React Context + **sessionStorage 持久化**（刷新不丢进度） |
| 录屏/视频 | Playwright + ffmpeg（`scripts/`） |
| 部署 | Surge（`dist/` + `public/CNAME`） |

**Win 首次环境：**

```powershell
cd oia-5302-demo
npm install
npm run dev
# 需要 ffmpeg 在 PATH（视频合成）
# 需要 Playwright 浏览器：npx playwright install chromium
```

---

## 3. 用户旅程（场景映射）

### 候选人 Portal（C1–C6）

| 步骤 | 屏幕 | 要点 |
|------|------|------|
| C1 | 申请 & CV 解析 | 上传 CV → Evidence → Confirm all fields → Submit（certification 空会自动填占位） |
| C2 | CV 差分 | 红绿 diff → Accept & continue |
| C3 | 在线测评 | 4 道双语 MCQ → Submit → 看分 → Continue |
| C4 | AI Avatar 面试 | EN 问答 → AR 问答 → **Submit interview**（必须点，否则 HR 无录音） |
| C5 | 我的分数 | 匹配分 + 改进建议 |
| C6 | 申请状态 | Exit portal |

### HR Portal（H1–H5）

| 步骤 | 屏幕 | 要点 |
|------|------|------|
| H1 | 匹配仪表盘 | 6 人排名、Evidence、Export CSV |
| H2 | Shortlist | **必须填 reason + Shortlist**（演示叙事需要） |
| H3 | 面试回放 | Play recording、transcript |
| H4 | 终审 | Recommend hire / Reject + 理由 + Confirm |
| H5 | 审计 & 收束 | 全表 + Export audit CSV + closing 页 |

### Landing（S0）

- 四支柱价值卡片
- 网络状态灯：Connected ↔ Offline

---

## 4. 关键源码位置

```
src/
  App.tsx                 # DemoProvider、selectRole、seedDemoForHr、session 持久化
  context/DemoContext.tsx
  lib/session.ts          # sessionStorage key: oia-5302-demo-session
  lib/demoSeed.ts         # 进 HR 时自动加载 Sara 的 demo 面试数据
  lib/matching.ts         # 排名、动态追问文案
  components/
    RoleSelect.tsx        # Landing + Reset demo 按钮
    CandidatePortal.tsx   # C1–C6
    HrPortal.tsx          # H1–H5
    Layout.tsx            # 侧栏步骤 + lockNote
    InterviewReviewPanel.tsx
    AvatarPanel.tsx       # 2D viseme 占位，非真 TTS
    NetworkStatus.tsx
  data/                   # 合成候选人、JD、MCQ、面试 preset

scripts/
  mux-natural.mjs         # ✅ 正式合成：不变速、CFR 30fps
  mux-final.mjs           # → 转发到 mux-natural
  sync-audio-video.mjs    # ⚠️ 禁止用：setpts 慢放导致「变速」
  align-by-transcript.mjs # Whisper 分段对齐旁白
  record-demo.mjs         # Playwright 自动录屏（快，~88s，已弃用做最终版）
  clean-voiceover.mjs     # 去口水音 adeclick
  generate-narration-pdf.mjs

video-output/
  OIA-Demo-Screen.mp4     # 用户 Win 手动录屏 ~268s
  OIA-Demo-Final.mp4      # 修复后成品 ~268s
  voiceover.m4a / voiceover-clean.m4a
  voiceover-segments.json # 13 段旁白时间轴
  手动录屏指南.md
```

---

## 5. Mac 上已做的重要修复（Win 上代码应已包含）

> **说明：** 旁白/录屏/合成视频 **不是项目重点**，只是 skylerz 临时自用，可完全忽略 `scripts/mux-*.mjs`、`video-output/` 里除旁白 PDF 以外的内容。正式版工作集中在 **Web Demo 原型**。

### 5.1 功能 / UX

1. **sessionStorage 持久化** — 刷新不回到 Landing；只有 Exit portal / Reset demo 才清空
2. **C1 Submit 灰色** — `confirmAllFields()` 会把 certification 补占位并标 parsed
3. **MCQ** — 每题只选一个 radio（Playwright 录屏也修了）
4. **C4 面试** — 先填答案再 Send；Submit interview 解锁 C5/C6
5. **HR「Waiting on candidate」误导** — 改为准确 `lockNote`（H3/H4/H5 不同文案）
6. **H3 Proceed 点不动** — 去掉 shortlist 硬门槛；点 Proceed 时若未 shortlist 会自动补 reason 并标记 shortlisted，再进 H4
7. **进 HR 无面试数据** — `selectRole('hr')` 和 `HrPortal` mount 时自动 `seedDemoForHr()`
8. **Landing Reset demo** — 清 sessionStorage，解决卡步骤

### 5.2 视频 / 旁白（**可忽略，非交付物**）

用户自述：把简单问题复杂化了。以下仅供存档，**Win 正式版开发不必读、不必维护**。

- 若将来真要合成：`npm run video:mux`（不要用 `video:sync-uniform`）
- 旁白 PDF：`OIA-Demo-Narration-Script-EN.pdf` 仍可用于现场讲解
- 其余 `video-output/*.mp4`、`scripts/sync-*.mjs` 等可删可留，不影响 Demo

---

## 6. 投标硬边界（正式版也不能越界）

来自 RFQ / 任务单，**Demo 与正式版文档都要遵守：**

- ❌ 情绪识别标签、写实生成口型、真 Jadarah 写回（须标 simulated）
- ❌ 未实测性能数字、深监考 / 10 并发 / 故障切换
- ❌ 真实候选人 PII
- ✅ Avatar：确定性音素→视素；「emotional」= 对话状态驱动表情
- ✅ 断网段零出站（演示用 UI 模拟即可，正式版要真断网）
- ✅ 分数可点开 Evidence；空理由拒提交；无人自动录用
- ✅ 合成数据包：5 份 CV + JD + 题 + 问候语

---

## 7. 原型 vs 正式版 — 建议下一步

当前是 **UI + 假数据 + 模拟 AI**。正式版通常要：

| 模块 | 原型现状 | 正式版方向 |
|------|----------|------------|
| CV 解析 | 规则/预设字段 | 本地 LLM + OCR/PDF 解析 + Evidence 回链 |
| 匹配 | `lib/matching.ts` 静态权重 | JD 维度配置 + 可解释打分 |
| 测评 | 固定 MCQ | 题库服务 + 防作弊（若 scope 内） |
| Avatar 面试 | 定时器模拟说话 | 本地 ASR → LLM 追问 → TTS → viseme/lip-sync |
| 离线 | 顶栏 toggle | 真禁用 egress + 本地模型路由 |
| Jadarah | 按钮文案 | Simulated endpoint + 将来 API 适配层 |
| HR SSO | 无 | OIA SSO + MFA 集成 |
| 审计 | sessionStorage | 持久化 DB + 导出合规格式 |
| 部署 | Surge 静态站 | On-prem Oman / air-gapped 目标环境 |

**Win 上建议优先：**

1. `git init` + 首次 commit（Mac 上 **尚无 git commit**）
2. 确认 `npm run build` / `npm run dev` 在 Win 正常
3. 硬刷新验证 https://oia-rfq-5302.surge.sh 或本地 preview
4. 按 RFQ Gate 列表逐项对照缺口（S0–S8）

---

## 8. npm scripts 速查

```json
"dev" / "build" / "deploy:surge"  → 核心
"pdf:narration"                   → 英文旁白 PDF（现场用）
"video:*"                         → 可忽略，非正式版范围
```

---

## 9. 给 Win 上 Cursor Agent 的操作约定

- **用户习惯：** 直接在代码里改，少废话；不要擅自 git commit / deploy，除非用户明确要求
- **改代码：** 最小 diff，匹配现有 CSS/TS 风格，不过度抽象
- **视频任务：** 非项目重点，可忽略
- **Demo 卡步骤：** 先建议 Landing → Reset demo，再查 sessionStorage
- **HR 流程：** H1 → H2 shortlist → H3 → H4 → H5；H3 Proceed 现在应始终可点

---

## 10. 相关文件清单（随项目拷贝到 Win）

必带：

- 整个 `src/`、`scripts/`、`public/`
- `package.json`、`package-lock.json`、`vite.config.ts`、`tsconfig*.json`
- `OIA-Demo-Narration-Script-EN.pdf`（现场念稿）
- `video-output/voiceover*.m4a`、`voiceover-segments.json`、`手动录屏指南.md`
- 可选：`video-output/OIA-Demo-Final.mp4`（已修复成品）

可不带 / 可 `.gitignore`：

- `node_modules/`、`dist/`
- `video-output/seg-work/`、`.mux-natural-*.mp4` 临时文件

---

## 11. 一句话状态（2026-08-13）

**可点击双语双 Portal 原型已完成并部署；下一步在 Win 上做 RFQ 5302 正式版（真离线推理、Avatar 链路、持久化审计等）。旁白/合成视频为个人临时需求，与正式版无关。**

---

*本文档由 Mac 会话生成，供 Win 会话 `@WIN-HANDOFF.md` 或「读交接文档」后直接继续。*
