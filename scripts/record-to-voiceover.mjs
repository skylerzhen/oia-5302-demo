/**
 * Record demo paced to voiceover-segments.json (hold = segment duration − actions).
 * Then mux voiceover → OIA-Demo-Final.mp4
 */
import { chromium } from 'playwright'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { DEMO_URL as DEFAULT_DEMO_URL } from './narration-segments.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEMO_URL = process.env.DEMO_URL || DEFAULT_DEMO_URL
const SEGMENTS_FILE = path.join(ROOT, 'video-output/voiceover-segments.json')
const VOICEOVER = fs.existsSync(path.join(ROOT, 'video-output/voiceover-clean.m4a'))
  ? path.join(ROOT, 'video-output/voiceover-clean.m4a')
  : path.join(ROOT, 'video-output/voiceover.m4a')
const OUT_DIR = path.join(ROOT, 'video-output/raw')
const WEBM = path.join(OUT_DIR, 'demo-recording.webm')
const SCREEN = path.join(ROOT, 'video-output/OIA-Demo-Screen.mp4')
const FINAL = path.join(ROOT, 'video-output/OIA-Demo-Final.mp4')
const MARKERS = path.join(ROOT, 'video-output/demo-markers.json')

const markers = []
let t0 = 0

function run(cmd, quiet = false) {
  return execSync(cmd, { encoding: 'utf8', stdio: quiet ? ['pipe', 'pipe', 'pipe'] : 'inherit' })
}

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

function mark(section, note) {
  const atSec = (Date.now() - t0) / 1000
  markers.push({ section, note, atSec: Number(atSec.toFixed(2)) })
  console.log(`  [${atSec.toFixed(1)}s] ${section} — ${note}`)
}

async function holdUntil(section, endSec, label) {
  const need = Math.max(300, endSec * 1000 - (Date.now() - t0))
  mark(section, `${label} (→${endSec.toFixed(1)}s)`)
  await wait(need)
}

let sectionStart = 0
function beginSection() {
  sectionStart = Date.now()
}

async function waitUntilEnabled(locator, timeout = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await locator.isEnabled().catch(() => false)) return
    await wait(400)
  }
  throw new Error(`Timeout: ${locator}`)
}

async function clickWhenEnabled(locator) {
  await waitUntilEnabled(locator)
  await locator.click()
}

function loadSegments() {
  if (!fs.existsSync(SEGMENTS_FILE)) throw new Error(`Run analyze-voiceover first: ${SEGMENTS_FILE}`)
  return JSON.parse(fs.readFileSync(SEGMENTS_FILE, 'utf8')).segments
}

async function main() {
  const segs = loadSegments()
  const seg = (id) => segs.find((s) => s.id === id)
  const endAt = (id) => seg(id).end

  fs.mkdirSync(OUT_DIR, { recursive: true })
  t0 = Date.now()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  })
  const page = await context.newPage()

  console.log('Recording synced to voiceover at', DEMO_URL)

  // 01 open
  beginSection()
  await page.goto(DEMO_URL, { waitUntil: 'networkidle' })
  await holdUntil('01-open', endAt('01-open'), 'Landing')

  // 02 s0 — user says "online/offline" (~42s)
  beginSection()
  const netBtn = page.locator('.network-status.landing')
  if (await netBtn.count()) {
    await netBtn.click()
    await wait(1200)
    await netBtn.click()
  }
  await holdUntil('02-s0', endAt('02-s0'), 'Network lamp')

  // 03 c1 — "job seeker side" (~47s)
  beginSection()
  await page.getByRole('button', { name: /Candidate portal/i }).click()
  await wait(800)
  await page.getByRole('button', { name: /Enter application/i }).click()
  await wait(800)
  await page.locator('.upload-list button').first().click()
  await wait(600)
  const ev = page.getByRole('button', { name: /Evidence/i }).first()
  if (await ev.count()) {
    await ev.click()
    await wait(1000)
    await page.getByRole('button', { name: /Close/i }).click().catch(() => page.keyboard.press('Escape'))
    await wait(400)
  }
  await page.getByRole('button', { name: /Confirm all fields/i }).click()
  await wait(400)
  const cert = page.locator('label.field-row').filter({ hasText: 'Professional certification' }).locator('input')
  if (await cert.count()) await cert.fill('CFA Level II (candidate)')
  await clickWhenEnabled(page.getByRole('button', { name: /Submit profile/i }))
  await holdUntil('03-c1', endAt('03-c1'), 'C1 done')

  // 04 c2 — "CV update" (~71s)
  beginSection()
  await page.getByRole('button', { name: /Accept & continue/i }).click()
  await holdUntil('04-c2', endAt('04-c2'), 'C2 diff')

  // 05 c3 — "online test" (~90s)
  beginSection()
  const fieldsets = page.locator('fieldset.mcq')
  const n = await fieldsets.count()
  for (let i = 0; i < n; i++) {
    await fieldsets.nth(i).locator('input[type="radio"]').first().check()
    await wait(350)
  }
  await clickWhenEnabled(page.getByRole('button', { name: /Submit exam/i }))
  await wait(800)
  await page.getByRole('button', { name: /Continue to AI interview/i }).click()
  await holdUntil('05-c3', endAt('05-c3'), 'C3 exam')

  // 06 c4 — "AI interview" (~107s)
  beginSection()
  await page.getByRole('button', { name: /Start interview/i }).click()
  const en = page.locator('textarea[placeholder*="English"]')
  await en.waitFor({ state: 'visible', timeout: 120000 })
  await wait(2000)
  await en.fill('I led a quarterly portfolio review and presented risk drivers to the board.')
  await clickWhenEnabled(page.getByRole('button', { name: /Send English answer/i }))
  await wait(1500)
  await clickWhenEnabled(page.getByRole('button', { name: /Continue to Arabic/i }))
  const ar = page.locator('textarea[dir="rtl"]')
  await ar.waitFor({ state: 'visible', timeout: 120000 })
  await wait(1500)
  await ar.fill('أعددنا تقريراً ربع سنوياً يوضح التباين بين التوقعات والنتائج.')
  await clickWhenEnabled(page.getByRole('button', { name: /Send Arabic answer/i }))
  await wait(1500)
  await clickWhenEnabled(page.getByRole('button', { name: /Submit interview/i }))
  await holdUntil('06-c4', endAt('06-c4'), 'C4 interview')

  // 07 c56 — match score / exit (~141s)
  beginSection()
  await page.getByRole('button', { name: /View application status/i }).click()
  await wait(800)
  await page.getByRole('button', { name: /Exit portal/i }).click()
  await wait(600)
  await page.getByRole('button', { name: /HR \/ Recruiter portal/i }).click()
  await holdUntil('07-c56', endAt('07-c56'), 'HR portal')

  // 08 h1 — "HR dashboard" (~152s)
  beginSection()
  await page.evaluate(() => window.scrollTo(0, 400))
  await wait(800)
  await page.getByRole('button', { name: /Continue to shortlist/i }).click()
  await holdUntil('08-h1', endAt('08-h1'), 'H1 dashboard')

  // 09 h2
  beginSection()
  await page.locator('textarea[placeholder*="shortlist"]').fill('Top match on all dimensions, strong bilingual interview.')
  await clickWhenEnabled(page.getByRole('button', { name: /Shortlist candidate/i }))
  await holdUntil('09-h2', endAt('09-h2'), 'H2 shortlist')

  // 10 h3
  beginSection()
  const play = page.getByRole('button', { name: /Play recording/i })
  if (await play.count()) await play.click()
  await wait(1500)
  await page.getByRole('button', { name: /Proceed to final decision/i }).click()
  await holdUntil('10-h3', endAt('10-h3'), 'H3 replay')

  // 11 h4
  beginSection()
  await page.getByRole('button', { name: /Recommend hire/i }).click()
  await page.locator('textarea[placeholder*="Final decision"]').fill('Recommend hire based on 98% match and strong interview.')
  await clickWhenEnabled(page.getByRole('button', { name: /Confirm final decision/i }))
  await holdUntil('11-h4', endAt('11-h4'), 'H4 decision')

  // 12 h5
  beginSection()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await holdUntil('12-h5', endAt('12-h5'), 'H5 audit')

  // 13 close
  beginSection()
  await holdUntil('13-close', endAt('13-close'), 'Closing')

  const video = page.video()
  await context.close()
  await browser.close()

  const totalSec = (Date.now() - t0) / 1000
  fs.writeFileSync(MARKERS, JSON.stringify({ totalSec, markers }, null, 2))

  if (video) {
    const src = await video.path()
    if (fs.existsSync(WEBM)) fs.unlinkSync(WEBM)
    fs.renameSync(src, WEBM)
    run(`ffmpeg -y -i "${WEBM}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${SCREEN}"`)
  }

  const vDur = Number(run(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${SCREEN}"`, true).trim())
  const aDur = Number(run(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${VOICEOVER}"`, true).trim())
  console.log(`\nScreen ${vDur.toFixed(1)}s | Voice ${aDur.toFixed(1)}s`)

  // Pad video to match audio if slightly short (never trim audio)
  if (vDur < aDur - 0.3) {
    const pad = aDur - vDur
    run(
      `ffmpeg -y -i "${SCREEN}" -vf "tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${SCREEN}.pad.mp4"`,
      true,
    )
    fs.renameSync(`${SCREEN}.pad.mp4`, SCREEN)
  } else if (vDur > aDur + 0.3) {
    run(`ffmpeg -y -i "${SCREEN}" -t ${aDur} -c copy "${SCREEN}.trim.mp4"`, true)
    fs.renameSync(`${SCREEN}.trim.mp4`, SCREEN)
  }

  console.log(`\n✅ Screen saved: ${SCREEN}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
