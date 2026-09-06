#!/usr/bin/env node
/** Rewrite operation guide for tester workflows (dual-tab interview simulation). */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'scripts/demo-guide-body.html')
const OUT_DIR = path.join(ROOT, 'deliverables/demo-5302')
const OUT = path.join(OUT_DIR, 'demo-operation-guide.html')
const OUT_ZH = path.join(OUT_DIR, '操作指南.html')

let html = fs.readFileSync(SRC, 'utf8')

const cssExtra = [
  '.step-list{counter-reset:step;margin:.5rem 0 0;padding:0;list-style:none}',
  '.step-list>li{counter-increment:step;position:relative;padding:.55rem 0 .55rem 2.4rem;border-bottom:1px dashed var(--line);font-size:.9rem;color:#475569}',
  '.step-list>li:last-child{border-bottom:none}',
  '.step-list>li::before{content:counter(step);position:absolute;left:0;top:.5rem;width:1.65rem;height:1.65rem;border-radius:999px;background:var(--navy);color:#fff;font-size:.75rem;font-weight:600;display:grid;place-items:center}',
  '.step-list>li strong{color:var(--navy-soft)}',
  '.callout{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:.85rem 1rem;margin:.75rem 0;font-size:.88rem;color:#1e3a5f}',
  '.callout strong{color:#1d4ed8}',
].join('')

if (!html.includes('.step-list{')) {
  html = html.replace('.block li{margin:.25rem 0}', `.block li{margin:.25rem 0}${cssExtra}`)
}

const testingSection = [
  '<div class="section-head" id="testing"><span class="section-dot" style="background:#2563eb"></span><h3>测试操作指南</h3></div>',

  '<article class="block"><h4>开始之前</h4><ul>',
  '<li>使用 <strong>Chrome 或 Edge</strong>，准备 <strong>两个标签页</strong>（同一浏览器，不要无痕/不同浏览器）</li>',
  '<li>打开 <a href="https://oia-recruitment.uiscloud.cc">oia-recruitment.uiscloud.cc</a>，先点 <strong>Reset demo</strong> 清空旧数据</li>',
  '<li>建议窗口 <strong>左右并排</strong>：左 = 候选人，右 = HR，方便来回切换</li>',
  '<li>C4 面试需允许<strong>麦克风</strong>；API 冷启动时首轮连接可能需等 30–60 秒</li>',
  '</ul></article>',

  '<article class="block" id="interview-dual"><h4>一人模拟双端：Live 面试交互（重点）</h4>',
  '<p class="callout"><strong>目标：</strong>同一个人交替操作两个标签，验证「候选人 C4 面试」与「HR H1 实时监控 / 推题」是否联动。</p>',
  '<ol class="step-list">',
  '<li><strong>标签 A（候选人）</strong>：Landing → <strong>Candidate portal</strong> → MFA 登录（复制页面 6 位码）→ 进入 C1</li>',
  '<li><strong>标签 B（HR）</strong>：新开标签，同一网址 → <strong>HR / Recruiter portal</strong> → MFA 登录 → 进入 H1 Review queues</li>',
  '<li><strong>标签 A</strong>：C1 上传 CV（或点 Demo sample 加载 Sara）→ C2 <strong>Submit profile</strong></li>',
  '<li><strong>标签 B</strong>：切回 H1，应看到该申请人出现在队列；若无，刷新 B 或等 2 秒再切回</li>',
  '<li><strong>标签 A</strong>：进入 C3 Technical assessment，答完并 <strong>Submit</strong></li>',
  '<li><strong>标签 A</strong>：进入 <strong>C4 AI interview</strong>，先<strong>不要点 Start</strong></li>',
  '<li><strong>标签 B</strong>：在 H1 页面向下找到 <strong>Live interview monitor</strong>（此时可能显示 Waiting for candidate to start C4…）</li>',
  '<li><strong>标签 A</strong>：点击 <strong>Start interview</strong>，允许麦克风；等 Avatar 视频出现</li>',
  '<li><strong>标签 B</strong>：Live monitor 应变为 <strong>Live</strong>，并开始出现 Avatar / Candidate 文字行</li>',
  '<li><strong>标签 A</strong>：用<strong>语音或文字</strong>回答第一轮问题，等 Avatar 说完再答</li>',
  '<li><strong>标签 B</strong>：确认 transcript 新增 Candidate 行（与 A 侧同步，无需刷新）</li>',
  '<li><strong>标签 B</strong>：在 <strong>Push next avatar question</strong> 输入英文问题，如 <code>Tell me about your experience with document automation.</code> → 点 <strong>Queue for next turn</strong></li>',
  '<li><strong>标签 A</strong>：继续下一轮；Avatar 应优先念出 B 刚推送的问题（非默认题库时以 HR 题为准）</li>',
  '<li>重复 10–13 共 <strong>2–3 轮</strong>，直至 C4 显示面试完成或出现 Submit / 进入 C5</li>',
  '<li><strong>标签 B</strong>：Live monitor 显示 Submitted → 点 <strong>Open full replay (H3)</strong> 或侧栏进 H3</li>',
  '<li><strong>标签 B</strong>：H3 检查逐轮 transcript、维度分、<strong>Play recording</strong>（TTS 重演）</li>',
  '<li><strong>标签 A</strong>：进入 C5 Match insights，确认有三柱分数</li>',
  '</ol></article>',

  '<article class="block"><h4>窗口切换技巧（一个人测时不乱）</h4><ul>',
  '<li><strong>Alt+Tab / Ctrl+Tab</strong> 在两个标签间切换；HR 侧以「看 transcript 是否多一行」为同步信号</li>',
  '<li>操作顺序永远是：<strong>A 行动 → B 验证 → B 行动（推题）→ A 继续</strong></li>',
  '<li>不要在面试中途对 B 标签点 <strong>Load demo application</strong>，会覆盖 A 正在进行的会话</li>',
  '<li>若 B 一直空白：确认同浏览器、A 已 Submit profile + 完成 C3、C4 已 Start 且至少有一轮 turn</li>',
  '</ul></article>',

  '<article class="block"><h4>快捷测面试（跳过 C1–C3）</h4><ul>',
  '<li><strong>标签 A</strong>：Landing → Journey test channel → MFA → 点 <strong>Jump to C4 interview ready</strong></li>',
  '<li><strong>标签 B</strong>：HR portal → H1 → <strong>Load demo application</strong>（仅当 A 尚未开始时用于预载；双端联测时优先让 A 自己推进）</li>',
  '<li>然后直接从上面步骤 7 开始测 Live monitor + 推题</li>',
  '</ul></article>',

  '<article class="block"><h4>其他必测项（清单）</h4><ul>',
  '<li><strong>双端记录一致</strong>：A 填完 C2 后 B 的 H1 队列与 CV 摘要更新</li>',
  '<li><strong>断线恢复</strong>：C4 视频黑屏时点 Reconnect video；仍失败则 Restart interview</li>',
  '<li><strong>H2 初筛</strong>：Shortlist / Decline + 理由</li>',
  '<li><strong>H4 终审</strong>：调权重 → Hire/Reject → A 的 C6 显示结果</li>',
  '<li><strong>Journey J12</strong>：双标签分别打开 C6 与 H5，确认同一申请人状态</li>',
  '</ul></article>',

  '<article class="block"><h4>测试通过标准（面试段）</h4><ul>',
  '<li>B 的 Live monitor 在 C4 进行中显示 Live，且每轮 A 回答后 transcript 增加</li>',
  '<li>HR Queue 的英文题能在 A 下一轮被 Avatar 问到</li>',
  '<li>面试结束后 H3 有完整 turns，Play recording 可播放</li>',
  '<li>A 的 C5、B 的 H3 对应同一申请人、同一轮次内容</li>',
  '</ul></article>',
].join('')

html = html.replace(/<div class="section-head" id="whatsnew">[\s\S]*?(?=<div class="section-head" id="start">)/, '')

if (html.includes('id="testing"')) {
  html = html.replace(/<div class="section-head" id="testing">[\s\S]*?(?=<div class="section-head" id="start">)/, testingSection)
} else {
  html = html.replace('<div class="section-head" id="start">', testingSection + '<div class="section-head" id="start">')
}

html = html.replace(/<li><a href="#whatsnew">[\s\S]*?<\/li>/, '')
if (!html.includes('href="#testing"')) {
  html = html.replace(
    '<div class="nav-group"><p class="nav-group-title">目录</p><ul>',
    '<div class="nav-group"><p class="nav-group-title">目录</p><ul><li><a href="#testing">测试操作指南</a></li><li><a href="#interview-dual">一人双标签测面试</a></li>',
  )
} else {
  html = html.replace(
    /<li><a href="#testing">[\s\S]*?<\/li>/,
    '<li><a href="#testing">测试操作指南</a></li><li><a href="#interview-dual">一人双标签测面试</a></li>',
  )
}

html = html.replace(
  /<p>[\s\S]*?<\/p>\s*<div class="hero-tags">/,
  '<p>教测试员如何在<strong>一个浏览器、两个标签</strong>里分别扮演候选人与 HR，完成 Live 面试联动、推题、回放与终审验收。</p><div class="hero-tags">',
)

html = html.replace(
  /<div class="hero-tags">[\s\S]*?<\/div>/,
  '<div class="hero-tags"><span>双标签</span><span>C4 面试</span><span>Live monitor</span><span>HR 推题</span><span>H3 回放</span></div>',
)

html = html.replace('3. 推荐演示路径', '3. 全流程参考路径')
html = html.replace('href="#path">推荐演示路径', 'href="#path">全流程参考路径')
html = html.replace(
  '<article class="block"><h4>标准双标签（约 15–25 分钟）</h4>',
  '<article class="block"><h4>完整流程概览（面试段见上文步骤）</h4>',
)

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(SRC, html, 'utf8')
fs.writeFileSync(OUT, html, 'utf8')
fs.writeFileSync(OUT_ZH, html, 'utf8')
console.log('OK', OUT, OUT_ZH)
