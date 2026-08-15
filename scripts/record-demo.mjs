/**
 * Screen-only demo — ~6 min pacing for live narration sync.
 * Output: video-output/OIA-Demo-Screen.mp4 + demo-markers.json
 */
import { chromium } from 'playwright'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { DEMO_URL as DEFAULT_DEMO_URL } from './narration-segments.mjs'
import { HOLDS, SECTIONS } from './demo-timing.mjs'

const DEMO_URL = process.env.DEMO_URL || DEFAULT_DEMO_URL
const OUT_DIR = path.resolve('video-output/raw')
const WEBM = path.join(OUT_DIR, 'demo-recording.webm')
const MP4 = path.resolve('video-output/OIA-Demo-Screen.mp4')
const MARKERS = path.resolve('video-output/demo-markers.json')

const markers = []
let t0 = 0

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

function mark(section, note) {
  const elapsed = (Date.now() - t0) / 1000
  markers.push({ section, note, atSec: Number(elapsed.toFixed(2)) })
  console.log(`  [${elapsed.toFixed(1)}s] ${section} — ${note}`)
}

async function hold(section, ms, note = 'hold') {
  mark(section, note)
  await wait(ms)
}

async function waitUntilEnabled(locator, timeout = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await locator.isEnabled().catch(() => false)) return
    await wait(400)
  }
  throw new Error(`Timed out: ${locator}`)
}

async function clickWhenEnabled(locator, timeout = 120000) {
  await waitUntilEnabled(locator, timeout)
  await locator.click()
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  t0 = Date.now()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  })
  const page = await context.newPage()

  console.log('Recording ~6 min demo at', DEMO_URL)

  await page.goto(DEMO_URL, { waitUntil: 'networkidle' })
  await hold(SECTIONS[0], HOLDS.landingIntro, 'Landing — narrate opening')

  const netBtn = page.locator('.network-status.landing')
  if (await netBtn.count()) {
    mark(SECTIONS[1], 'Network toggle offline')
    await netBtn.click()
    await wait(2500)
    mark(SECTIONS[1], 'Network toggle online')
    await netBtn.click()
  }
  await hold(SECTIONS[1], HOLDS.afterNetwork, 'S0 — narrate network lamp')

  mark(SECTIONS[2], 'Open candidate portal')
  await page.getByRole('button', { name: /Candidate portal/i }).click()
  await wait(1500)
  mark(SECTIONS[2], 'Enter application')
  await page.getByRole('button', { name: /Enter application/i }).click()
  await hold(SECTIONS[2], HOLDS.afterEnterPortal, 'C1 — Jadarah login')

  mark(SECTIONS[2], 'Upload CV')
  await page.locator('.upload-list button').first().click()
  await hold(SECTIONS[2], HOLDS.afterUpload, 'C1 — parsed fields / Evidence')

  const evidenceBtn = page.getByRole('button', { name: /Evidence/i }).first()
  if (await evidenceBtn.count()) {
    mark(SECTIONS[2], 'Open Evidence modal')
    await evidenceBtn.click()
    await wait(2000)
    await page.getByRole('button', { name: /Close/i }).click().catch(() => page.keyboard.press('Escape'))
    await wait(800)
  }

  mark(SECTIONS[2], 'Confirm all fields')
  await page.getByRole('button', { name: /Confirm all fields/i }).click()
  await wait(800)
  const certInput = page.locator('label.field-row').filter({ hasText: 'Professional certification' }).locator('input')
  if (await certInput.count()) await certInput.fill('CFA Level II (candidate)')
  await hold(SECTIONS[2], HOLDS.afterConfirm, 'C1 — confirm fields')

  mark(SECTIONS[2], 'Submit profile')
  await clickWhenEnabled(page.getByRole('button', { name: /Submit profile/i }))
  await hold(SECTIONS[2], HOLDS.afterSubmit, 'C1 — submitted')

  await hold(SECTIONS[3], HOLDS.c2Review, 'C2 — diff table')
  mark(SECTIONS[3], 'Accept diff')
  await page.getByRole('button', { name: /Accept & continue/i }).click()
  await hold(SECTIONS[3], HOLDS.afterC2, 'C2 — accepted')

  const fieldsets = page.locator('fieldset.mcq')
  const mcqCount = await fieldsets.count()
  for (let i = 0; i < mcqCount; i++) {
    mark(SECTIONS[4], `MCQ Q${i + 1}`)
    await fieldsets.nth(i).locator('input[type="radio"]').first().check()
    await wait(HOLDS.perMcq)
  }
  mark(SECTIONS[4], 'Submit exam')
  await clickWhenEnabled(page.getByRole('button', { name: /Submit exam/i }))
  await hold(SECTIONS[4], HOLDS.afterExam, 'C3 — score breakdown')

  mark(SECTIONS[4], 'Continue to interview')
  await page.getByRole('button', { name: /Continue to AI interview/i }).click()
  await hold(SECTIONS[5], HOLDS.c4Intro, 'C4 — intro / step bar')

  mark(SECTIONS[5], 'Start interview')
  await page.getByRole('button', { name: /Start interview/i }).click()
  await hold(SECTIONS[5], HOLDS.afterAvatarGreet, 'C4 — avatar greeting')

  const enTextarea = page.locator('textarea[placeholder*="English"]')
  await enTextarea.waitFor({ state: 'visible', timeout: 120000 })
  await enTextarea.fill(
    'I led a quarterly portfolio review and presented risk drivers to the board.',
  )
  mark(SECTIONS[5], 'Send English answer')
  await clickWhenEnabled(page.getByRole('button', { name: /Send English answer/i }))
  await hold(SECTIONS[5], HOLDS.afterEnglish, 'C4 — English segment')

  mark(SECTIONS[5], 'Continue to Arabic')
  await clickWhenEnabled(page.getByRole('button', { name: /Continue to Arabic/i }))
  await wait(2000)

  const arTextarea = page.locator('textarea[dir="rtl"]')
  await arTextarea.waitFor({ state: 'visible', timeout: 120000 })
  await arTextarea.fill('أعددنا تقريراً ربع سنوياً يوضح التباين بين التوقعات والنتائج.')
  mark(SECTIONS[5], 'Send Arabic answer')
  await clickWhenEnabled(page.getByRole('button', { name: /Send Arabic answer/i }))
  await hold(SECTIONS[5], HOLDS.afterArabicSegment, 'C4 — Arabic segment')

  mark(SECTIONS[5], 'Submit interview')
  await clickWhenEnabled(page.getByRole('button', { name: /Submit interview/i }))
  await hold(SECTIONS[5], HOLDS.afterSubmitInterview, 'C4 — submitted')

  mark(SECTIONS[6], 'C5 match score')
  await page.getByRole('button', { name: /View application status/i }).click()
  await hold(SECTIONS[6], HOLDS.c5Status, 'C6 — application status')

  mark(SECTIONS[6], 'Exit portal')
  await page.getByRole('button', { name: /Exit portal/i }).click()
  await wait(1500)
  mark(SECTIONS[6], 'Open HR portal')
  await page.getByRole('button', { name: /HR \/ Recruiter portal/i }).click()
  await hold(SECTIONS[6], HOLDS.afterExit, 'Switch to HR')

  await hold(SECTIONS[7], HOLDS.h1Dashboard, 'H1 — dashboard / KPI / table')
  mark(SECTIONS[7], 'Scroll dashboard')
  await page.evaluate(() => window.scrollTo(0, 400))
  await hold(SECTIONS[7], HOLDS.afterH1Scroll, 'H1 — evidence / export')

  mark(SECTIONS[7], 'Continue to shortlist')
  await page.getByRole('button', { name: /Continue to shortlist/i }).click()
  await wait(1500)

  await page.locator('textarea[placeholder*="shortlist"]').fill('Top match on all dimensions, strong bilingual interview.')
  await hold(SECTIONS[8], HOLDS.h2Form, 'H2 — shortlist reason')
  mark(SECTIONS[8], 'Shortlist candidate')
  await clickWhenEnabled(page.getByRole('button', { name: /Shortlist candidate/i }))
  await hold(SECTIONS[8], HOLDS.afterShortlist, 'H2 — shortlisted')

  const playBtn = page.getByRole('button', { name: /Play recording/i })
  if (await playBtn.count()) {
    mark(SECTIONS[9], 'Play recording')
    await playBtn.click()
  }
  await hold(SECTIONS[9], HOLDS.h3Play, 'H3 — avatar replay / transcript')
  mark(SECTIONS[9], 'Proceed to final decision')
  await page.getByRole('button', { name: /Proceed to final decision/i }).click()
  await hold(SECTIONS[9], HOLDS.afterH3, 'H3 — done')

  mark(SECTIONS[10], 'Recommend hire')
  await page.getByRole('button', { name: /Recommend hire/i }).click()
  await page.locator('textarea[placeholder*="Final decision"]').fill('Recommend hire based on 98% match and strong interview.')
  await hold(SECTIONS[10], HOLDS.h4Form, 'H4 — AI rec + reason')
  mark(SECTIONS[10], 'Confirm final decision')
  await clickWhenEnabled(page.getByRole('button', { name: /Confirm final decision/i }))
  await hold(SECTIONS[10], HOLDS.afterH4, 'H4 — confirmed')

  mark(SECTIONS[11], 'Scroll audit table')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await hold(SECTIONS[11], HOLDS.h5Audit, 'H5 — audit table')
  await hold(SECTIONS[12], HOLDS.closing, 'Closing — thank you')

  const video = page.video()
  await context.close()
  await browser.close()

  const totalSec = (Date.now() - t0) / 1000
  fs.writeFileSync(MARKERS, JSON.stringify({ recordedAt: new Date().toISOString(), totalSec, markers }, null, 2))
  console.log(`\nMarkers → ${MARKERS} (${totalSec.toFixed(1)}s)`)

  if (video) {
    const src = await video.path()
    if (fs.existsSync(WEBM)) fs.unlinkSync(WEBM)
    fs.renameSync(src, WEBM)
    execSync(
      `ffmpeg -y -i "${WEBM}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${MP4}"`,
      { stdio: 'inherit' },
    )
    const dur = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${MP4}"`,
      { encoding: 'utf8' },
    ).trim()
    console.log(`\n✅ ${MP4} — ${Number(dur).toFixed(1)}s`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
