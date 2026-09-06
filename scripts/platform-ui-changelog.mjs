#!/usr/bin/env node
/** Platform UI changelog: capture screenshots + internal ZH / external EN HTML deliverables. */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'deliverables/demo-5302/platform-ui-changelog')
const SHOT_DIR = path.join(OUT_DIR, 'screenshots')
const DEMO_URL = process.env.DEMO_URL || 'http://127.0.0.1:5173'

const META = {
  versionLabel: 'Platform UI v0.5.0-rc1',
  baseVersion: '0.4.1',
  branch: 'platform-ui',
  date: '2026-09-06',
  liveUrl: 'https://oia-recruitment.uiscloud.cc',
  apiUrl: 'https://oia-5302-demo.onrender.com',
  docVersion: '2.0',
  publisher: 'UIS Cloud',
  project: 'OIA RFQ 5302 Demo',
}

const SECTIONS = [
  {
    id: 'foundation',
    zh: 'A. 视觉与壳层基础',
    en: 'A. Visual foundation and shell',
    color: '#0b1f3f',
  },
  {
    id: 'candidate',
    zh: 'B. 候选人体验',
    en: 'B. Candidate experience',
    color: '#1e4a7a',
  },
  {
    id: 'auth',
    zh: 'C. 入口与身份认证',
    en: 'C. Entry and identity',
    color: '#2b5878',
  },
  {
    id: 'hr',
    zh: 'D. HR 招聘官工作区',
    en: 'D. HR recruiter workspace',
    color: '#3a4668',
  },
  {
    id: 'acceptance',
    zh: 'E. UIS 验收与测试通道',
    en: 'E. UIS acceptance channel',
    color: '#4a3d5c',
  },
  {
    id: 'engineering',
    zh: 'F. 工程与交付',
    en: 'F. Engineering and delivery',
    color: '#5a4a48',
  },
]

const CHANGES = [
  { section: 'foundation', id: 'UI-001', shot: '01-entry-three-portals.png', type: 'visual',
    zh: '主权海军蓝设计令牌（Design Tokens）', en: 'Sovereign navy design tokens',
    sumZh: '建立完整 --oia-* CSS 变量体系：色板、圆角、间距、阴影与字体栈。',
    sumEn: 'Full --oia-* CSS variable system: palette, radii, spacing, shadows, and font stacks.',
    bulletsZh: ['主色：navy900 侧栏 / navy primary 操作色', '字体：Inter（UI）、Source Serif 4（标题）、IBM Plex Mono（代码/分数）', '与 UIS Cloud 政企原型视觉对齐', '全局 accent 收敛，消除旧版分散色值'],
    bulletsEn: ['Primary surfaces: navy900 sidebar, navy primary actions', 'Fonts: Inter (UI), Source Serif 4 (headings), IBM Plex Mono (codes/scores)', 'Aligned with UIS Cloud enterprise prototype look', 'Global accent unified; legacy scattered colours removed'],
    impactZh: '所有后续 UI 改造有统一视觉语法，演示「平台感」而非散页 demo。',
    impactEn: 'Establishes a shared visual language for platform-grade presentation.',
    files: ['index.html', 'src/index.css', 'src/App.css'] },
  { section: 'foundation', id: 'UI-002', shot: '04-candidate-sidebar.png', type: 'layout',
    zh: '235px 固定侧栏 + 内容顶栏壳层', en: '235px fixed sidebar and content top bar',
    sumZh: '双 portal 采用 app-shell 布局：侧栏导航 + 顶栏上下文 + 可滚动主工作区。',
    sumEn: 'Dual-portal app-shell: sidebar navigation, contextual top bar, scrollable workspace.',
    bulletsZh: ['侧栏宽 235px（--oia-sidebar-width）', '顶栏：Portal 名 / 当前步骤 / Step N of M / 网络灯 / Exit', '主区切换步骤时自动 scroll-to-top', '品牌区改为 OIA Recruitment + RFQ 5302 prototype'],
    bulletsEn: ['Sidebar width 235px (--oia-sidebar-width)', 'Top bar: portal name, step, N of M, network lamp, exit', 'Auto scroll-to-top on step change', 'Branding: OIA Recruitment + RFQ 5302 prototype'],
    impactZh: '用户始终知道所在 portal、步骤与连接状态。',
    impactEn: 'Users always see portal context, step position, and connectivity.',
    files: ['CandidatePortal.tsx (Layout)', 'src/App.css'], noteZh: 'Layout 内联 CandidatePortal.tsx（UTF-8 安全）。' },
  { section: 'foundation', id: 'UI-003', shot: '05-candidate-application.png', type: 'component',
    zh: 'Evidence Review 证据审阅框架', en: 'Evidence Review card framing',
    sumZh: 'CV 与面试审阅面板统一「证据卡片」结构，支持审计与下钻。',
    sumEn: 'Unified evidence card structure for CV and interview review with audit drill-down.',
    bulletsZh: ['CvReviewPanel：双栏 CV 源 + 可编辑字段', 'InterviewReviewPanel：回放 + 评估 + 维度', 'Evidence 定位与高亮回链 CV 原文', 'CompletenessPill 提取完整度指示'],
    bulletsEn: ['CvReviewPanel: dual-column source + editable fields', 'InterviewReviewPanel: replay, evaluation, dimensions', 'Evidence locate highlights source CV text', 'CompletenessPill for extraction completeness'],
    impactZh: '满足 RFQ 可解释匹配与 HR 人工复核要求。',
    impactEn: 'Supports explainable matching and human review requirements.',
    files: ['CvReviewPanel.tsx', 'InterviewReviewPanel.tsx', 'EvidenceModal.tsx'] },
  { section: 'foundation', id: 'UI-004', shot: '01-entry-three-portals.png', type: 'visual',
    zh: 'Landing 双栏认证布局（portal-auth-screen）', en: 'Split-screen landing auth layout',
    sumZh: '入口页改为左侧品牌叙事 + 右侧交互卡片，替代旧版居中四卡片。',
    sumEn: 'Entry uses left brand narrative plus right interaction card instead of centred tiles.',
    bulletsZh: ['左侧：数据主权 / 离线面试 / HR 终审三条承诺', '右侧：portal 选择 / SSO / MFA 卡片切换', '网络状态灯可切换 offline 模拟', 'Reset demo + CV 数据包下载链接'],
    bulletsEn: ['Left rail: residency, offline interview, human final authority', 'Right card: portal pick / SSO / MFA phases', 'Toggle offline network lamp', 'Reset demo and CV package download'],
    impactZh: '首屏即传递 B2G 部署叙事与双 portal 分离设计。',
    impactEn: 'First screen communicates B2G deployment story and portal separation.',
    files: ['RoleSelect.tsx', 'src/App.css'] },
  { section: 'candidate', id: 'UI-010', shot: '07-candidate-command-centre.png', type: 'feature',
    zh: 'C5 Command Centre 综合评分页', en: 'C5 Candidate command centre',
    sumZh: '候选人「Match insights」升级为指挥页：加权合成、三柱 KPI、维度证据、改进建议。',
    sumEn: 'Match insights upgraded to command centre: composite, pillar KPIs, evidence, tips.',
    bulletsZh: ['加权合成与 HR H4 pillar 权重一致', 'CV / Assessment / Interview 三柱贡献条', '六维度成就率 + CV 原文证据', 'Improvement tips 基于缺口维度生成', 'Composite 推导公式透明展示'],
    bulletsEn: ['Weighted composite aligned with HR H4 pillars', 'CV / assessment / interview contribution bars', 'Six dimension achievement + CV evidence', 'Improvement tips from gap analysis', 'Transparent composite derivation'],
    impactZh: '候选人看到「为什么是这个分」而非单一数字。',
    impactEn: 'Candidates see why a score exists, not just a number.',
    files: ['CandidatePortal.tsx (CandidateScorePanel inline)'], noteZh: '独立 tsx 已删除（UTF-16）；逻辑内联。' },
  { section: 'candidate', id: 'UI-011', shot: '04-candidate-sidebar.png', type: 'navigation',
    zh: '侧栏产品化导航（Application progress）', en: 'Product-style sidebar navigation',
    sumZh: '移除 C1–C6 内部编号外露，改为业务步骤名 + 序号圆标 + 完成态 + 图标。',
    sumEn: 'Replaced exposed C1–C6 codes with business labels, numbered markers, completion, icons.',
    bulletsZh: ['6 步：Application → Profile review → … → Application status', '完成步显示 Done 标记；当前步高亮', '锁定提示人话化（非 Submit profile in C1）', '进度计数：N/6 complete', '页面 H1 去除 C1 · 前缀'],
    bulletsEn: ['Six steps from Application through Application status', 'Done marker for completed steps; active highlight', 'Plain-language lock hints', 'Progress counter N/6 complete', 'Page H1s drop internal code prefixes'],
    impactZh: '侧栏像真实 HCM 申请进度，而非测试脚本步骤表。',
    impactEn: 'Sidebar reads like real HCM application progress.',
    files: ['src/lib/demo.ts', 'CandidatePortal.tsx', 'HrPortal.tsx', 'App.css'] },
  { section: 'candidate', id: 'UI-012', shot: '05-candidate-application.png', type: 'feature',
    zh: 'C1 上传工作区与阶段条', en: 'C1 upload workspace and phase strip',
    sumZh: 'C1 保留 Upload → Review → Submit 三阶段条与拖拽上传、Demo 样例 CV。',
    sumEn: 'C1 keeps Upload → Review → Submit phase strip, drag-drop, and demo CV samples.',
    bulletsZh: ['c1-phase-steps 横向阶段指示', 'PDF/DOCX/PNG/JPG 支持', 'Demo samples 一键加载 Sara 等', '上传后 Evidence 预览 + Apply to profile'],
    bulletsEn: ['Horizontal c1-phase-steps indicator', 'PDF/DOCX/PNG/JPG support', 'Demo samples for Sara et al.', 'Post-upload evidence preview and apply'],
    impactZh: '申请第一步即体现 Document Intelligence 能力。',
    impactEn: 'First step showcases document intelligence capability.',
    files: ['CandidatePortal.tsx', 'cvUploadFlow.ts'] },
  { section: 'auth', id: 'UI-020', shot: '01-entry-three-portals.png', type: 'feature',
    zh: '三通道入口（Candidate / HR / Journey）', en: 'Three-channel entry',
    sumZh: '入口第三卡片 Journey test channel，与 PDF Screen 03 对齐。',
    sumEn: 'Third entry card Journey test channel aligned with PDF screen 03.',
    bulletsZh: ['Candidate：Jadarah token 流程', 'HR：OIA SSO + MFA', 'Journey：UIS 12 步验收导航', '三通道共享同一 application record', 'Reload 回到入口（role 不持久化）'],
    bulletsEn: ['Candidate: Jadarah token flow', 'HR: OIA SSO + MFA', 'Journey: UIS 12-step navigator', 'All channels share one application record', 'Reload returns to entry (role not persisted)'],
    impactZh: '验收人员可独立测试双 portal 而不干扰候选人/HR 演示路径。',
    impactEn: 'Acceptance testers can navigate dual portals without disrupting demo paths.',
    files: ['RoleSelect.tsx', 'src/types.ts', 'App.tsx'] },
  { section: 'auth', id: 'UI-021', shot: '02-mock-sign-in.png', type: 'feature',
    zh: 'Mock SSO 登录（Screen 01）', en: 'Mock SSO sign-in (Screen 01)',
    sumZh: '每 portal 独立 Screen 01：预填 mock 凭据，模拟 Jadarah / OIA SSO。',
    sumEn: 'Per-portal Screen 01 with prefilled mock credentials for Jadarah / OIA SSO.',
    bulletsZh: ['候选人：National ID 12345678', 'HR：recruiter@oia.gov.om', 'Journey：uis-acceptance', '只读输入框 + Continue to MFA', 'Back 返回 portal 选择'],
    bulletsEn: ['Candidate: National ID 12345678', 'HR: recruiter@oia.gov.om', 'Journey: uis-acceptance', 'Read-only fields + Continue to MFA', 'Back returns to portal pick'],
    impactZh: '演示政企 SSO 流程而不接真 IdP。',
    impactEn: 'Demonstrates enterprise SSO without real IdP integration.',
    files: ['RoleSelect.tsx'] },
  { section: 'auth', id: 'UI-022', shot: '03-mfa-authenticator.png', type: 'feature',
    zh: '动态 MFA + Simulated Authenticator', en: 'Dynamic MFA and simulated authenticator',
    sumZh: '每次 MFA 生成新 6 位 OTP；推送卡片模拟 Authenticator app。',
    sumEn: 'Fresh six-digit OTP per MFA attempt; push card simulates authenticator app.',
    bulletsZh: ['随机 6 位码（100000–999999）', 'OIA Authenticator 推送 UI（Simulated 标签）', '点击码自动填入；Send new code 重发', '错误提示不再暴露固定 demo 码', '取代旧版固定 530206'],
    bulletsEn: ['Random 6-digit code (100000–999999)', 'OIA Authenticator push UI (Simulated tag)', 'Tap code to autofill; Send new code', 'Errors do not expose a fixed demo code', 'Replaces legacy fixed 530206'],
    impactZh: '更接近真实 2FA 体验，同时保留 demo 可 walkthrough 性。',
    impactEn: 'Closer to real 2FA while remaining demo-walkable.',
    files: ['RoleSelect.tsx', 'App.css'] },
  { section: 'hr', id: 'UI-030', shot: '06-hr-review-queues.png', type: 'layout',
    zh: 'HR H1 Review Queues 布局拆分', en: 'HR H1 review queues layout split',
    sumZh: 'H1 拆为 JD/面试配置区 + 候选人排名队列表，强化招聘官操作台。',
    sumEn: 'H1 split into JD/interview config and ranked candidate queue.',
    bulletsZh: ['配置与队列视觉分离（config split）', 'rank-table 队列：Match % / Qualified / Evidence', 'Load demo application 预载 Sara 全链路', 'Export CSV + JD 权重调节', 'H1 标签改为 Review queues'],
    bulletsEn: ['Visual split between config and queue', 'rank-table: match %, qualified, evidence', 'Load demo seeds Sara end-to-end', 'CSV export and JD weight controls', 'H1 label: Review queues'],
    impactZh: 'HR 首屏即看到「管队列 + 配规则」而非单一仪表盘。',
    impactEn: 'HR lands on queue management plus rule configuration.',
    files: ['HrPortal.tsx', 'MatchDashboard.tsx', 'demo.ts'] },
  { section: 'hr', id: 'UI-031', shot: '06-hr-review-queues.png', type: 'navigation',
    zh: 'HR 侧栏 Recruitment workspace', en: 'HR sidebar recruitment workspace',
    sumZh: 'HR 5 步侧栏产品化：Review queues → Screening → Interview review → Final decision → Audit。',
    sumEn: 'HR five-step sidebar: queues, screening, interview review, final decision, audit.',
    bulletsZh: ['H1–H5 内部 ID 不再侧栏外露', '锁定：Interview must be submitted first', '完成态与候选人侧栏一致', '顶栏 Step N of 5'],
    bulletsEn: ['H1–H5 codes hidden from sidebar chrome', 'Lock: interview must be submitted first', 'Completion markers match candidate pattern', 'Top bar Step N of 5'],
    impactZh: 'HR portal 与候选人 portal 同等「产品化」程度。',
    impactEn: 'HR portal matches candidate portal product polish.',
    files: ['demo.ts', 'HrPortal.tsx', 'CandidatePortal.tsx (Layout)'] },
  { section: 'hr', id: 'UI-032', shot: '06-hr-review-queues.png', type: 'component',
    zh: 'Enterprise integrations 侧栏面板', en: 'Enterprise integrations sidebar panel',
    sumZh: '侧栏底部 Jadarah / Oracle EBS 模拟写回状态，标注 simulated endpoint。',
    sumEn: 'Sidebar Jadarah / Oracle EBS simulated write-back status with endpoint labels.',
    bulletsZh: ['每次 profile submit / assessment / decision 触发 sync 事件', '显示 operation / endpoint / refId / timestamp', 'Simulation 标签明确非生产连接', '审计日志同步记录 Integration 事件'],
    bulletsEn: ['Sync events on profile, assessment, decision', 'Shows operation, endpoint, refId, timestamp', 'Simulation badge: no production connectivity', 'Audit log mirrors integration events'],
    impactZh: '视觉化 Jadarah 集成交付边界（simulated endpoint）。',
    impactEn: 'Visualises Jadarah integration delivery boundary.',
    files: ['IntegrationStatusPanel.tsx', 'simulatedIntegrations.ts'] },
  { section: 'acceptance', id: 'UI-040', shot: '08-journey-test-channel.png', type: 'feature',
    zh: 'Journey Test Channel（PDF Screen 03）', en: 'Journey test channel (PDF screen 03)',
    sumZh: '第三 portal：12 步 UIS 验收导航，仅导航不 fork 数据。',
    sumEn: 'Third portal: 12-step UIS navigator; navigation only, no data fork.',
    bulletsZh: ['J01–J12 映射 C1–C6 + H1–H5', 'KPI：Application record / Candidate step / HR step / Interview turns', 'Demo seed：Sara 全量 / C4 ready 快捷', '逐步 Jump 到 Candidate 或 HR 步骤', 'Exit to portals 返回入口'],
    bulletsEn: ['J01–J12 maps to C1–C6 and H1–H5', 'KPIs: record, candidate step, HR step, turns', 'Demo seeds: full Sara / C4 ready', 'Per-step jump to candidate or HR', 'Exit to portals returns to entry'],
    impactZh: 'UIS 双 portal 联调与验收的专用工具面。',
    impactEn: 'Dedicated surface for UIS dual-portal acceptance testing.',
    files: ['App.tsx', 'DemoContext.tsx', 'types.ts'], noteZh: 'JourneyTestChannel.tsx 删除；逻辑内联 App.tsx。' },
  { section: 'acceptance', id: 'UI-041', shot: '08-journey-test-channel.png', type: 'feature',
    zh: 'Journey 步骤状态解析', en: 'Journey step status resolution',
    sumZh: '每步自动计算 Pending / In progress / Complete，基于 pipeline 真实状态。',
    sumEn: 'Each step auto-resolves Pending / In progress / Complete from pipeline state.',
    bulletsZh: ['resolveJourneyStepStatus 读 pipeline + fields + turns', 'J12 Dual-portal verification 双端校验', 'Active 行高亮 live-application-row', 'Assessment score KPI 展示'],
    bulletsEn: ['resolveJourneyStepStatus reads pipeline, fields, turns', 'J12 dual-portal verification step', 'Active row highlight', 'Assessment score in KPI row'],
    impactZh: '验收人员一眼看到旅程真实进度，非静态假状态。',
    impactEn: 'Testers see live journey progress, not static placeholders.',
    files: ['App.tsx (inline journey steps)'] },
  { section: 'engineering', id: 'UI-050', shot: null, type: 'fix',
    zh: 'Windows UTF-16 编码防护', en: 'Windows UTF-16 encoding guard',
    sumZh: 'Cursor Write 在 Windows 可能生成 UTF-16 .tsx，导致 Vite oxc PARSE_ERROR。',
    sumEn: 'Cursor Write on Windows may create UTF-16 .tsx files causing Vite oxc PARSE_ERROR.',
    bulletsZh: ['CandidateScorePanel.tsx → 内联 CandidatePortal', 'JourneyTestChannel.tsx → 内联 App.tsx', 'Layout.tsx → 内联 CandidatePortal', '新文件优先 StrReplace / Copy-Item UTF-8', '症状：文件体积约 2x、首行 Invalid Character'],
    bulletsEn: ['CandidateScorePanel inlined into CandidatePortal', 'JourneyTestChannel inlined into App.tsx', 'Layout inlined into CandidatePortal', 'Prefer StrReplace or UTF-8 copy for new files', 'Symptom: ~2x file size, line 1 parse error'],
    impactZh: '避免 demo 现场 build 崩溃。',
    impactEn: 'Prevents on-site demo build failures.',
    files: ['CandidatePortal.tsx', 'App.tsx'], noteZh: '内部运维条目；外部 PDF 可省略细节。', internalOnly: true },
  { section: 'engineering', id: 'UI-051', shot: null, type: 'infra',
    zh: 'DemoContext 扩展与 session 语义', en: 'DemoContext extensions and session semantics',
    sumZh: '新增 journey role、returnToEntry；Journey 打开写审计条目。',
    sumEn: 'Added journey role, returnToEntry; journey open writes audit entry.',
    bulletsZh: ['UserRole: candidate | hr | journey', 'returnToEntry() 清除 role 回入口', 'selectRole(journey) 不 fork 数据', 'loadSession 刷新清空 role', 'integrationSyncs 全 portal 共享'],
    bulletsEn: ['UserRole: candidate | hr | journey', 'returnToEntry() clears role to landing', 'selectRole(journey) does not fork data', 'loadSession clears role on reload', 'integrationSyncs shared across portals'],
    impactZh: '三通道架构在状态层落地。',
    impactEn: 'Three-channel architecture reflected in state layer.',
    files: ['App.tsx', 'DemoContext.tsx', 'types.ts', 'session.ts'] },
  { section: 'engineering', id: 'UI-052', shot: null, type: 'delivery',
    zh: '变更 PDF 自动生成流水线', en: 'Changelog PDF automation pipeline',
    sumZh: 'Playwright 截图 + 中英文 PDF 一键生成（本文档）。',
    sumEn: 'Playwright capture plus bilingual PDF generation (this document).',
    bulletsZh: ['npm run pdf:platform-ui', '8 张关键界面截图', 'Internal ZH / External EN 双版本', '截图默认 localhost:5173', 'deliverables/demo-5302/platform-ui-changelog/'],
    bulletsEn: ['npm run pdf:platform-ui', 'Eight key UI screenshots', 'Internal ZH and external EN variants', 'Screenshots from localhost:5173 by default', 'Output under deliverables/demo-5302/platform-ui-changelog/'],
    impactZh: '每次 UI 迭代可重复生成对外/对内交付物。',
    impactEn: 'Repeatable internal and external deliverables per UI iteration.',
    files: ['scripts/platform-ui-changelog.mjs', 'package.json'] },
]

const KNOWN_ISSUES_ZH = [
  { sev: 'P1', text: 'disqualified 术语尚未统一为 Below screening threshold（P0 #10）' },
  { sev: 'P1', text: '录音回放为 LiveAvatar replay + transcript，非独立 mp4 双轨' },
  { sev: 'P2', text: 'Surge 线上仍为旧 UI，需 deploy:surge 同步 platform-ui' },
  { sev: 'P2', text: 'C5 PDF 截图可能停在 loading，需加长 capture 等待 LLM match' },
  { sev: 'Ops', text: 'docs/、README 含中文运维说明；src/ UI 字符串为英文' },
]

const UNCHANGED_EN = [
  'Core S0–S8 evaluation journey and gate semantics',
  'Human-in-the-loop: empty reason blocks shortlist / hire / reject',
  'Synthetic data only; simulated Jadarah / Oracle endpoints',
  'Single application record across Candidate and HR portals',
  'LiveAvatar / local AI / Render API integration behaviour',
  'Offline egress guard when network lamp set to offline',
]

async function wait(ms) { await new Promise((r) => setTimeout(r, ms)) }

const ZOOM_IN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>`

function shotSrc(file, embed) {
  if (!file) return null
  const abs = path.join(SHOT_DIR, file)
  if (!fs.existsSync(abs)) return null
  if (embed) {
    const buf = fs.readFileSync(abs)
    return `data:image/png;base64,${buf.toString('base64')}`
  }
  return `screenshots/${file}`
}

function figRel(file, cap, embed = false, lang = 'zh') {
  const src = shotSrc(file, embed)
  const zoomLabel = lang === 'zh' ? `放大查看：${cap}` : `View larger: ${cap}`
  if (!src) {
    const missing = lang === 'zh' ? `Screenshot missing: ${file}` : `Screenshot missing: ${file}`
    return `<figure class="shot"><div class="shot-empty">${missing}</div></figure>`
  }
  return `<figure class="shot">
    <button type="button" class="shot-btn" aria-label="${zoomLabel}">
      <img src="${src}" alt="${cap}" loading="lazy"/>
      <span class="shot-zoom">${ZOOM_IN_ICON}</span>
    </button>
  </figure>`
}

function docCss(lang) {
  const sans = lang === 'zh'
    ? '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    : '"Inter", system-ui, "Segoe UI", sans-serif'
  const serif = '"Source Serif 4", Georgia, "Times New Roman", serif'
  return `
  :root {
    --navy: #0b1f3f; --navy-soft: #1a3a5c; --ink: #1e293b; --muted: #64748b;
    --line: #e2e8f0; --canvas: #f1f5f9; --card: #ffffff; --accent: #2563eb;
    --good: #047857; --warn: #b45309; --sidebar: 280px;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0; font-family: ${sans}; color: var(--ink); background: var(--canvas);
    line-height: 1.65; font-size: 15px;
  }
  .layout { display: grid; grid-template-columns: var(--sidebar) 1fr; min-height: 100vh; }
  .sidebar {
    position: sticky; top: 0; height: 100vh; overflow: auto;
    background: linear-gradient(180deg, #071428 0%, var(--navy) 100%);
    color: #e8eef7; padding: 1.25rem 1rem 2rem;
  }
  .sidebar-brand { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: #94a8c0; margin-bottom: .35rem; }
  .sidebar h1 { font-family: ${serif}; font-size: 1.15rem; line-height: 1.35; margin: 0 0 1rem; color: #fff; font-weight: 600; }
  .sidebar-meta { font-size: .78rem; color: #b8c9de; margin-bottom: 1.25rem; line-height: 1.5; }
  .sidebar-meta a { color: #93c5fd; }
  .nav-group { margin-bottom: 1rem; }
  .nav-group-title { font-size: .68rem; text-transform: uppercase; letter-spacing: .07em; color: #7d93ad; margin: 0 0 .45rem; }
  .nav-group ul { list-style: none; margin: 0; padding: 0; }
  .nav-group a {
    display: block; padding: .35rem .5rem; border-radius: 6px; color: #dce6f3;
    text-decoration: none; font-size: .82rem; line-height: 1.35;
  }
  .nav-group a:hover, .nav-group a:focus { background: rgba(255,255,255,.08); color: #fff; }
  .nav-group code { font-size: .68rem; color: #7d93ad; margin-right: .25rem; }
  .sidebar-foot { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,.12); font-size: .72rem; color: #7d93ad; }
  main { padding: 1.25rem 0 4rem; }
  .content { max-width: 1100px; padding: 0 2rem 2rem; }
  .section-head {
    display: flex; align-items: center; gap: .65rem; margin: 2rem 0 1rem;
    padding-bottom: .5rem; border-bottom: 2px solid var(--line);
  }
  .section-dot { width: 10px; height: 10px; border-radius: 999px; flex-shrink: 0; }
  .section-head h3 { font-family: ${serif}; font-size: 1.25rem; margin: 0; color: var(--navy); }
  .change {
    background: var(--card); border: 1px solid var(--line); border-radius: 14px;
    margin-bottom: 1rem; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,.04);
  }
  .change-inner { display: flex; flex-direction: column; }
  .change-body { padding: 1.15rem 1.25rem .75rem; }
  .change-media { background: #f8fafc; border-top: 1px solid var(--line); padding: 1rem 1.25rem 1.25rem; }
  .change-media .shot { margin: 0; }
  .change h4 { margin: 0 0 .5rem; font-size: 1rem; color: var(--navy-soft); font-weight: 600; }
  .change ul { margin: 0; padding-left: 1.15rem; color: #475569; font-size: .9rem; }
  .change li { margin: .2rem 0; }
  .shot { margin: 0; }
  .shot-btn {
    display: block; width: 100%; padding: 0; border: none; background: none; cursor: zoom-in;
    position: relative; border-radius: 10px; overflow: hidden;
  }
  .shot-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .shot img {
    width: 100%; display: block; border-radius: 10px; border: 1px solid var(--line);
    background: #fff; max-height: 520px; object-fit: contain; object-position: top center;
  }
  .shot-zoom {
    position: absolute; right: .65rem; bottom: .65rem;
    width: 2.35rem; height: 2.35rem; display: grid; place-items: center;
    border-radius: 999px; background: rgba(15,23,42,.78); color: #fff;
    box-shadow: 0 2px 8px rgba(15,23,42,.25); pointer-events: none;
  }
  .shot-zoom svg { width: 1.2rem; height: 1.2rem; display: block; }
  .shot-empty { min-height: 120px; display: grid; place-items: center; color: var(--muted); font-size: .82rem; border: 1px dashed var(--line); border-radius: 8px; }
  .lightbox {
    position: fixed; inset: 0; z-index: 9999; display: none; align-items: center; justify-content: center;
    padding: 1.5rem; background: rgba(7,20,40,.88); backdrop-filter: blur(4px);
  }
  .lightbox.open { display: flex; }
  .lightbox img {
    max-width: min(96vw, 1600px); max-height: 92vh; width: auto; height: auto;
    border-radius: 8px; box-shadow: 0 24px 64px rgba(0,0,0,.45); background: #fff;
  }
  .lightbox-close {
    position: absolute; top: 1rem; right: 1rem; width: 2.5rem; height: 2.5rem;
    border: none; border-radius: 999px; background: rgba(255,255,255,.15); color: #fff;
    font-size: 1.5rem; line-height: 1; cursor: pointer;
  }
  .lightbox-close:hover { background: rgba(255,255,255,.25); }
  table { width: 100%; border-collapse: collapse; font-size: .88rem; }
  th, td { border: 1px solid var(--line); padding: .55rem .65rem; text-align: left; vertical-align: top; }
  th { background: #f8fafc; color: var(--navy); font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; }
  tr:hover td { background: #fafbfc; }
  code { font-family: ui-monospace, Consolas, monospace; font-size: .82em; background: #f1f5f9; padding: .1rem .35rem; border-radius: 4px; }
  .issues .sev { font-family: ui-monospace, monospace; font-weight: 700; white-space: nowrap; }
  .sev-p1 { color: var(--warn); } .sev-p2 { color: #0369a1; } .sev-ops { color: var(--muted); }
  .footer {
    max-width: 980px; margin: 2rem 2.5rem 0; padding-top: 1rem; border-top: 1px solid var(--line);
    font-size: .78rem; color: var(--muted);
  }
  @media (max-width: 1080px) {
    .layout { grid-template-columns: 1fr; }
    .sidebar { position: relative; height: auto; }
    .content { padding-left: 1.25rem; padding-right: 1.25rem; }
    .shot img { max-height: 360px; }
  }
  @media print {
    .layout { grid-template-columns: 1fr; }
    .sidebar { display: none; }
    .content { padding: 1rem; }
    .lightbox { display: none !important; }
    .change { break-inside: avoid; }
  }
  `
}

function changeBlock(c, embed = false, lang = 'zh') {
  const title = lang === 'zh' ? c.zh : c.en
  const bullets = lang === 'zh' ? c.bulletsZh : c.bulletsEn
  const media = c.shot ? `<div class="change-media">${figRel(c.shot, title, embed, lang)}</div>` : ''
  return `<article class="change${c.shot ? '' : ' no-shot'}" id="${c.id}">
    <div class="change-inner">
      <div class="change-body">
        <h4>${title}</h4>
        <ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
      </div>
      ${media}
    </div>
  </article>`
}

const DOC_COPY = {
  zh: {
    htmlLang: 'zh-CN',
    title: 'Platform UI 改动记录',
    sidebarTitle: 'Platform UI 改动',
    sidebarMeta: (m) => `${m.date} · ${m.branch} · v${m.baseVersion} 基线`,
    lightboxLabel: '截图预览',
    lightboxClose: '关闭',
  },
  en: {
    htmlLang: 'en',
    title: 'Platform UI Changelog',
    sidebarTitle: 'Platform UI changes',
    sidebarMeta: (m) => `${m.date} · ${m.branch} · v${m.baseVersion} baseline`,
    lightboxLabel: 'Screenshot preview',
    lightboxClose: 'Close',
  },
}

function buildDoc({ embed = false, lang = 'zh' } = {}) {
  const copy = DOC_COPY[lang]
  const visible = CHANGES

  let nav = ''
  for (const sec of SECTIONS) {
    const items = visible.filter((c) => c.section === sec.id)
    if (!items.length) continue
    const secTitle = lang === 'zh' ? sec.zh : sec.en
    nav += `<div class="nav-group"><p class="nav-group-title">${secTitle}</p><ul>`
    nav += items.map((c) => `<li><a href="#${c.id}">${lang === 'zh' ? c.zh : c.en}</a></li>`).join('')
    nav += '</ul></div>'
  }

  let sections = ''
  for (const sec of SECTIONS) {
    const items = visible.filter((c) => c.section === sec.id)
    if (!items.length) continue
    const secTitle = lang === 'zh' ? sec.zh : sec.en
    sections += `<div class="section-head"><span class="section-dot" style="background:${sec.color}"></span><h3>${secTitle}</h3></div>`
    sections += items.map((c) => changeBlock(c, embed, lang)).join('')
  }

  const fontLinks = embed ? '' : `
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>`

  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${copy.title}</title>${fontLinks}
  <style>${docCss(lang)}</style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <h1>${copy.sidebarTitle}</h1>
      <p class="sidebar-meta">${copy.sidebarMeta(META)}</p>
      ${nav}
    </aside>
    <main>
      <div class="content">${sections}</div>
    </main>
  </div>
  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="${copy.lightboxLabel}">
    <button type="button" class="lightbox-close" aria-label="${copy.lightboxClose}">&times;</button>
    <img src="" alt=""/>
  </div>
  <script>
    (function () {
      var box = document.getElementById('lightbox');
      var img = box.querySelector('img');
      var closeBtn = box.querySelector('.lightbox-close');
      function open(src, alt) {
        img.src = src;
        img.alt = alt || '';
        box.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
      function close() {
        box.classList.remove('open');
        img.removeAttribute('src');
        document.body.style.overflow = '';
      }
      document.querySelectorAll('.shot-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var thumb = btn.querySelector('img');
          if (!thumb) return;
          open(thumb.src, thumb.alt);
        });
      });
      closeBtn.addEventListener('click', close);
      box.addEventListener('click', function (e) { if (e.target === box) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    })();
  </script>
</body>
</html>`
}

function writeHtml() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const zh = path.join(OUT_DIR, 'platform-ui-changes.html')
  const en = path.join(OUT_DIR, 'platform-ui-changes-en.html')
  fs.writeFileSync(zh, buildDoc({ embed: true, lang: 'zh' }), 'utf8')
  fs.writeFileSync(en, buildDoc({ embed: true, lang: 'en' }), 'utf8')
  console.log('OK', zh, '(中文，单文件，可直接发飞书)')
  console.log('OK', en, '(English, single file, attach to Feishu/Lark)')
}

async function capture() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  console.log('Capturing from', DEMO_URL, '- ensure npm run dev is running')
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  try {
    await page.goto(DEMO_URL, { waitUntil: 'networkidle', timeout: 60000 })
    await wait(800)
    await page.screenshot({ path: path.join(SHOT_DIR, '01-entry-three-portals.png') })
    await page.getByRole('button', { name: /Candidate portal/i }).click()
    await wait(500)
    await page.screenshot({ path: path.join(SHOT_DIR, '02-mock-sign-in.png') })
    await page.getByRole('button', { name: /Continue to MFA/i }).click()
    await wait(500)
    await page.screenshot({ path: path.join(SHOT_DIR, '03-mfa-authenticator.png') })
    const code = (await page.locator('.portal-auth-mfa-push-code').textContent())?.trim() ?? ''
    await page.locator('.portal-auth-mfa-input').fill(code)
    await page.getByRole('button', { name: /Verify and enter portal/i }).click()
    await wait(1000)
    await page.screenshot({ path: path.join(SHOT_DIR, '04-candidate-sidebar.png') })
    await page.screenshot({ path: path.join(SHOT_DIR, '05-candidate-application.png') })
    await page.getByRole('button', { name: /Exit portal/i }).click()
    await wait(600)
    await page.getByRole('button', { name: /HR \/ Recruiter portal/i }).click()
    await wait(400)
    await page.getByRole('button', { name: /Continue to MFA/i }).click()
    await wait(400)
    const hrCode = (await page.locator('.portal-auth-mfa-push-code').textContent())?.trim() ?? ''
    await page.locator('.portal-auth-mfa-input').fill(hrCode)
    await page.getByRole('button', { name: /Verify and enter portal/i }).click()
    await wait(1000)
    const load = page.getByRole('button', { name: /Load demo application/i }).first()
    if (await load.isVisible().catch(() => false)) { await load.click(); await wait(1200) }
    await page.screenshot({ path: path.join(SHOT_DIR, '06-hr-review-queues.png') })
    await page.getByRole('button', { name: /Exit portal/i }).click()
    await wait(600)
    await page.getByRole('button', { name: /Journey test channel/i }).click()
    await wait(400)
    await page.getByRole('button', { name: /Continue to MFA/i }).click()
    await wait(400)
    const jCode = (await page.locator('.portal-auth-mfa-push-code').textContent())?.trim() ?? ''
    await page.locator('.portal-auth-mfa-input').fill(jCode)
    await page.getByRole('button', { name: /Verify and enter portal/i }).click()
    await wait(1000)
    const seed = page.getByRole('button', { name: /Load demo application \(Sara\)/i })
    if (await seed.isVisible().catch(() => false)) { await seed.click(); await wait(800) }
    await page.screenshot({ path: path.join(SHOT_DIR, '08-journey-test-channel.png'), fullPage: true })
    try {
      const c5 = page.locator('.journey-nav-btn', { hasText: 'C5' }).first()
      if (await c5.isVisible({ timeout: 5000 }).catch(() => false)) {
        await c5.click()
        await page.waitForSelector('text=/Match score|Command centre|composite|Overall/i', { timeout: 20000 }).catch(() => wait(5000))
        await wait(1000)
        await page.screenshot({ path: path.join(SHOT_DIR, '07-candidate-command-centre.png'), fullPage: true })
      } else {
        console.warn('C5 nav button not visible — load demo on journey channel first')
      }
    } catch (err) {
      console.warn('C5 screenshot skipped:', err.message)
    }
    console.log('Screenshots saved to', SHOT_DIR)
  } catch (err) {
    console.error('Capture error:', err.message)
    throw err
  } finally { await browser.close() }
}

async function main() {
  const cmd = process.argv[2] || 'all'
  if (cmd === 'capture') return capture()
  if (cmd === 'html') return writeHtml()
  if (cmd === 'pdf') { console.warn('PDF output deprecated — use html'); return writeHtml() }
  await capture()
  writeHtml()
}

main().catch((e) => { console.error(e); process.exit(1) })
