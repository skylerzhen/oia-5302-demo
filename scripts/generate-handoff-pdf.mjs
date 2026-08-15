#!/usr/bin/env node
/** Generate Windows handoff PDF for Cursor agent — Playwright print. */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'OIA-Win-Handoff.pdf')

function buildHtml() {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/>
<style>
  @page { margin: 14mm 13mm; }
  body { font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Microsoft YaHei", Arial, sans-serif; color: #1e293b; line-height: 1.55; font-size: 10pt; }
  h1 { color: #0f766e; font-size: 18pt; margin: 0 0 0.15em; }
  h2 { color: #0f766e; font-size: 12pt; margin: 1.1em 0 0.4em; border-bottom: 2px solid #99f6e4; padding-bottom: 3px; page-break-after: avoid; }
  h3 { font-size: 10.5pt; margin: 0.8em 0 0.3em; color: #334155; }
  .meta { color: #64748b; font-size: 9.5pt; margin-bottom: 1em; }
  .callout { background: #ecfdf5; border: 1px solid #6ee7b7; padding: 8px 12px; border-radius: 6px; font-size: 9.5pt; margin: 0.6em 0; }
  .warn { background: #fffbeb; border-color: #fcd34d; }
  .ignore { background: #f8fafc; border-color: #cbd5e1; color: #64748b; }
  ul, ol { margin: 0.3em 0 0.5em 1.2em; padding: 0; }
  li { margin: 0.2em 0; }
  code, pre { font-family: ui-monospace, Consolas, monospace; font-size: 8.5pt; background: #f1f5f9; }
  pre { padding: 8px 10px; border-radius: 4px; overflow-wrap: anywhere; white-space: pre-wrap; margin: 0.4em 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 0.5em 0; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #ecfdf5; font-weight: 600; }
  .ok { color: #047857; }
  .no { color: #b91c1c; }
  .one-liner { font-weight: 600; background: #f0fdfa; padding: 10px 12px; border-left: 4px solid #0f766e; margin-top: 1em; }
  footer { margin-top: 1.5em; font-size: 8.5pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .section { page-break-inside: avoid; }
</style></head><body>

<h1>OIA RFQ 5302 — Windows 交接文档</h1>
<p class="meta">给 Win 上 Cursor Agent · 用户 skylerz · 2026-08-13 · 项目文件夹 oia-5302-demo</p>

<div class="callout"><strong>Win 上第一句话：</strong>先读本文，在此基础上继续 RFQ 5302 <strong>正式版</strong>开发。用户偏好直接在代码里改，少废话；不要擅自 git commit / deploy。</div>

<h2>1. 项目是什么</h2>
<p><strong>OIA RFQ 5302</strong> 评标用 AI 招聘助手 Demo。目标 <strong>8/17 前</strong>交付断网可跑、22–28 分钟、可点击走通的现场演示。</p>
<p>当前是 <strong>可点击原型</strong>，不是生产系统：</p>
<ul>
  <li>双 Portal：候选人（Jadarah token）与 HR（OIA SSO + MFA）完全分离</li>
  <li>离线面试段：顶栏网络灯 Connected / Offline</li>
  <li>双语 UI + 面试 EN / AR</li>
  <li>Human-in-the-loop：AI 只建议，HR 必须填理由才能 shortlist / hire / reject</li>
  <li>全链路审计：每步写入 audit log</li>
</ul>
<p><strong>线上 Demo：</strong> https://oia-rfq-5302.surge.sh</p>

<h2>2. 技术栈 &amp; Win 环境</h2>
<table>
  <tr><th>层</th><th>选型</th></tr>
  <tr><td>前端</td><td>Vite 8 + React 19 + TypeScript</td></tr>
  <tr><td>样式</td><td>纯 CSS（src/App.css），无 Tailwind</td></tr>
  <tr><td>状态</td><td>React Context + sessionStorage（刷新不丢进度）</td></tr>
  <tr><td>部署</td><td>Surge（npm run deploy:surge）</td></tr>
</table>
<pre>cd oia-5302-demo
npm install
npm run dev
npm run build</pre>
<p>Mac 上 <strong>尚无 git commit</strong>，Win 上建议 git init 后首次 commit。</p>

<h2>3. 用户旅程</h2>
<h3>候选人 C1–C6</h3>
<table>
  <tr><th>步</th><th>屏幕</th><th>要点</th></tr>
  <tr><td>C1</td><td>申请 &amp; CV 解析</td><td>上传 CV → Evidence → Confirm all → Submit</td></tr>
  <tr><td>C2</td><td>CV 差分</td><td>红绿 diff → Accept</td></tr>
  <tr><td>C3</td><td>在线测评</td><td>4 道 MCQ → Submit → Continue</td></tr>
  <tr><td>C4</td><td>AI 面试</td><td>EN → AR → <strong>Submit interview</strong>（必须点）</td></tr>
  <tr><td>C5/C6</td><td>分数 &amp; 状态</td><td>Exit portal</td></tr>
</table>
<h3>HR H1–H5</h3>
<table>
  <tr><th>步</th><th>屏幕</th><th>要点</th></tr>
  <tr><td>H1</td><td>匹配仪表盘</td><td>排名、Evidence、Export CSV</td></tr>
  <tr><td>H2</td><td>Shortlist</td><td>填 reason → Shortlist candidate</td></tr>
  <tr><td>H3</td><td>面试回放</td><td>Play、transcript → Proceed to final decision</td></tr>
  <tr><td>H4</td><td>终审</td><td>Hire/Reject + 理由 + Confirm</td></tr>
  <tr><td>H5</td><td>审计</td><td>全表 + Export + closing 页</td></tr>
</table>
<p>Landing：四支柱卡片 + 网络状态灯。</p>

<h2>4. 关键源码</h2>
<pre>src/App.tsx              — session、seedDemoForHr
src/lib/session.ts       — sessionStorage: oia-5302-demo-session
src/lib/demoSeed.ts      — 进 HR 自动加载 demo 面试数据
src/components/CandidatePortal.tsx  — C1–C6
src/components/HrPortal.tsx         — H1–H5
src/components/RoleSelect.tsx       — Landing + Reset demo
src/data/                — 合成候选人、JD、MCQ、面试 preset</pre>

<h2>5. Mac 上已修 bug（代码里应有）</h2>
<ol>
  <li>sessionStorage 持久化 — 刷新不回到 Landing</li>
  <li>C1 Submit 灰色 — confirmAllFields 补 certification 占位</li>
  <li>MCQ 每题只选一个</li>
  <li>C4 必须 Submit interview 才解锁 C5/C6</li>
  <li>HR 侧栏 lockNote 准确（不再一律 Waiting on candidate）</li>
  <li>H3 Proceed 始终可点；未 shortlist 时自动补 reason 并进 H4</li>
  <li>进 HR 无数据时自动 seedDemoForHr()</li>
  <li>Landing「Reset demo」清 sessionStorage</li>
</ol>

<div class="callout ignore"><strong>视频/旁白/合成：可完全忽略。</strong> 不是项目重点，用户自述把简单问题复杂化了。正式版只做 Web Demo。scripts/video-* 和 video-output/*.mp4 可删可留。</div>

<h2>6. 投标硬边界（不能越界）</h2>
<ul>
  <li class="no">❌ 情绪识别、写实口型、真 Jadarah 写回、未实测性能数字、真实 PII</li>
  <li class="ok">✅ 确定性音素→视素 Avatar；断网零出站；Evidence 可点；空理由拒提交；无人自动录用</li>
  <li class="ok">✅ Jadarah 须标 simulated endpoint；合成数据 only</li>
</ul>

<h2>7. 原型 → 正式版（下一步）</h2>
<table>
  <tr><th>模块</th><th>原型</th><th>正式版</th></tr>
  <tr><td>CV 解析</td><td>预设字段</td><td>本地 LLM + OCR + Evidence 回链</td></tr>
  <tr><td>匹配</td><td>静态权重 matching.ts</td><td>JD 维度 + 可解释打分</td></tr>
  <tr><td>Avatar</td><td>定时器模拟</td><td>ASR → LLM 追问 → TTS → lip-sync</td></tr>
  <tr><td>离线</td><td>UI toggle</td><td>真禁用 egress + 本地模型</td></tr>
  <tr><td>审计</td><td>sessionStorage</td><td>DB + 合规格式导出</td></tr>
  <tr><td>部署</td><td>Surge 静态</td><td>Oman on-prem / air-gapped</td></tr>
</table>
<p><strong>Win 优先：</strong> git init → npm run dev/build 验证 → 对照 RFQ Gate S0–S8 找缺口</p>

<h2>8. npm scripts</h2>
<table>
  <tr><th>命令</th><th>用途</th></tr>
  <tr><td>npm run dev</td><td>本地开发</td></tr>
  <tr><td>npm run build</td><td>构建 dist/</td></tr>
  <tr><td>npm run deploy:surge</td><td>部署 surge.sh</td></tr>
  <tr><td>npm run pdf:narration</td><td>英文现场念稿 PDF（可选）</td></tr>
  <tr><td>npm run video:*</td><td>可忽略</td></tr>
</table>

<h2>9. Agent 操作约定</h2>
<ul>
  <li>最小 diff，匹配现有代码风格，不过度抽象</li>
  <li>不要擅自 commit / push / deploy</li>
  <li>Demo 卡步骤 → Landing Reset demo</li>
  <li>HR 演示顺序：H1 → H2 → H3 → H4 → H5</li>
</ul>

<h2>10. 拷贝到 Win 的文件</h2>
<p><strong>必带：</strong> src/、public/、scripts/、package.json、package-lock.json、vite.config.ts、tsconfig*.json、OIA-Demo-Narration-Script-EN.pdf（可选）</p>
<p><strong>不必带：</strong> node_modules/、dist/</p>

<div class="one-liner">一句话：可点击双语双 Portal 原型已部署 surge；Win 上以此为基线做正式版（真离线、Avatar 链路、持久化审计）。视频合成与正式版无关。</div>

<footer>oia-5302-demo · OIA-Win-Handoff.pdf · 发给 Win Cursor：「读这个 PDF 继续正式版」</footer>
</body></html>`
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(buildHtml(), { waitUntil: 'load' })
  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
  })
  await browser.close()
  console.log('✅', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
