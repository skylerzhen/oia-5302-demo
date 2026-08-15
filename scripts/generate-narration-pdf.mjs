#!/usr/bin/env node
/** Generate Chinese narration script PDF via Playwright print. */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'OIA-Demo-Narration-Script-EN.pdf')

const SECTIONS = [
  {
    title: '1 · Opening · about 45 seconds',
    scene: '(landing page)',
    text: `This is our hiring assistant demo.

You can click through the whole process. A person applies. HR reviews them. A human makes the final yes or no. Every action is saved.

Two rules here. Job seekers and HR use different screens. The interview runs offline on local computers. Data stays inside the country.

The four cards show what we care about. Local data. Offline interview. English and Arabic. HR makes the final call, not the AI.`,
    pause: 'pause two seconds',
  },
  {
    title: '2 · Network light · about 25 seconds',
    scene: '(click the status light)',
    text: `This light shows if we are online or offline.

During the interview, outside internet is turned off. The AI runs locally.

Green means connected. Yellow means offline. Both sides see the same light.`,
    pause: 'pause one second',
  },
  {
    title: '3 · Apply · about one minute',
    scene: '(candidate side, upload, confirm, submit)',
    text: `We start on the job seeker side.

They log in and upload a CV. The system reads name, email, work history, and other fields.

Green means OK. Yellow means please check. Red means missing. Click Evidence to see where each value came from in the CV.

Confirm the fields and press Submit.`,
    pause: 'pause one second',
  },
  {
    title: '4 · CV update · about 30 seconds',
    scene: '(before and after table)',
    text: `If they upload a new CV, we show old and new side by side.

Changed fields are highlighted. They must press Accept. Nothing updates without that click.`,
    pause: 'pause one second',
  },
  {
    title: '5 · Test · about 45 seconds',
    scene: '(questions, submit, score)',
    text: `Next is a short test for the job.

Questions show in English and Arabic. They pick answers and submit. The score appears right away. They can see which answers were wrong.

They only see their own score.`,
    pause: 'pause one second',
  },
  {
    title: '6 · AI interview · about one minute',
    scene: '(interview flow)',
    text: `This is the AI interview.

First English. The avatar asks a follow-up. Then Arabic. Then Submit. HR gets the recording. The job seeker does not.

The photo and text on the left are stand-ins. The real system will use voice and moving lips.

Job seekers never see their rank or other people in the pool.`,
    pause: 'pause two seconds',
  },
  {
    title: '7 · Job seeker status · about 20 seconds',
    scene: '(score page, exit)',
    text: `They can see their match score and status. They cannot hire or reject anyone. We leave and open the HR side.`,
    pause: 'pause one second',
  },
  {
    title: '8 · HR dashboard · about one minute',
    scene: '(HR home screen)',
    text: `HR uses a different login and different screens.

Here we see six people ranked by fit. We can filter by skill, years, or degree. We can export to Excel.

Click a score to see why. Sara is at ninety-eight percent because we can point to lines in her CV. Not a hidden number.`,
    pause: 'pause one second',
  },
  {
    title: '9 · Shortlist · about 30 seconds',
    scene: '(type reason, shortlist)',
    text: `To move someone forward, HR must type a reason and press Shortlist. AI suggests. A person decides.`,
    pause: 'pause one second',
  },
  {
    title: '10 · Watch interview · about 45 seconds',
    scene: '(play back recording)',
    text: `HR can watch the interview again. Photo, text, and full chat in English and Arabic. Press Play or click one line to jump.

Job seekers cannot open this page.`,
    pause: 'pause two seconds',
  },
  {
    title: '11 · Final yes or no · about 40 seconds',
    scene: '(hire or reject, confirm)',
    text: `Last step. Hire or reject.

The screen shows an AI suggestion. HR picks Hire or Reject, writes why, and confirms. The system does not hire anyone by itself.`,
    pause: 'pause one second',
  },
  {
    title: '12 · Activity log · about 50 seconds',
    scene: '(big table, export)',
    text: `This table lists who did what and when. We can export it to a file.

The bottom page sums up the demo. Two separate screens. Clear scores. Human decisions. Two languages. Full history.`,
    pause: 'pause two seconds',
  },
  {
    title: '13 · End · about 30 seconds',
    scene: '(closing screen)',
    text: `That is the full demo. The real product will connect to Jadarah, run local AI, and use a live avatar. Thank you.`,
    pause: '',
  },
]

const STORYBOARD = [
  ['1', '0:00', 'Landing', '1. Opening'],
  ['2', '0:45', 'Status lamp', '2. Network'],
  ['3', '1:10', 'C1 apply', '3. Candidate'],
  ['4', '2:10', 'C2 diff', '4. CV update'],
  ['5', '2:40', 'C3 exam', '5. Assessment'],
  ['6', '3:25', 'C4 avatar', '6. Interview'],
  ['7', '4:40', 'C5/C6', '7. Wrap-up'],
  ['8', '5:00', 'H1 dashboard', '8. HR match'],
  ['9', '6:00', 'H2 shortlist', '9. Shortlist'],
  ['10', '6:30', 'H3 replay', '10. Replay'],
  ['11', '7:15', 'H4 decision', '11. Final'],
  ['12', '7:55', 'H5 audit', '12. Audit'],
  ['13', '8:45', 'End', '13. Closing'],
]

function buildHtml() {
  const sections = SECTIONS.map(
    (s) => `
    <section class="block">
      <h2>${s.title}</h2>
      <p class="scene">${s.scene}</p>
      <div class="narration">${s.text.split('\n\n').map((p) => `<p>${p}</p>`).join('')}</div>
      ${s.pause ? `<p class="pause">${s.pause}</p>` : ''}
    </section>`,
  ).join('')

  const table = STORYBOARD.map(
    ([n, t, scene, seg]) => `<tr><td>${n}</td><td>${t}</td><td>${scene}</td><td>${seg}</td></tr>`,
  ).join('')

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.65; font-size: 11pt; }
  h1 { color: #0f766e; font-size: 20pt; margin-bottom: 0.2em; }
  .meta { color: #64748b; font-size: 10pt; margin-bottom: 1.5em; }
  .tips { background: #fffbeb; border: 1px solid #fcd34d; padding: 10px 14px; border-radius: 8px; font-size: 10pt; margin-bottom: 1.5em; }
  h2 { color: #0f766e; font-size: 13pt; margin-top: 1.2em; border-bottom: 2px solid #99f6e4; padding-bottom: 4px; }
  .scene { color: #b45309; font-size: 10pt; font-weight: 600; margin: 6px 0; }
  .narration { background: #f0fdfa; border-left: 4px solid #0f766e; padding: 10px 14px; margin: 8px 0; }
  .narration p { margin: 0.4em 0; }
  .pause { color: #64748b; font-size: 9pt; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 1em; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  th { background: #ecfdf5; }
  .appendix h2 { margin-top: 2em; }
  footer { margin-top: 2em; font-size: 9pt; color: #94a3b8; text-align: center; }
</style></head><body>
  <h1>OIA RFQ 5302 Demo Voiceover Script</h1>
  <p class="meta">Natural English · about 9 to 11 minutes · https://oia-rfq-5302.surge.sh</p>
  <div class="tips"><strong>For recording</strong> Talk like you're walking someone through the screen. Skip lines in parentheses. Pause where marked.</div>
  ${sections}
  <div class="appendix">
    <h2>Appendix: Shot list for editing</h2>
    <table><thead><tr><th>#</th><th>Time</th><th>Screen</th><th>Section</th></tr></thead><tbody>${table}</tbody></table>
  </div>
  <footer>oia-5302-demo · synced with surge.sh deployment</footer>
</body></html>`
}

async function main() {
  const html = buildHtml()
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
  })
  await browser.close()
  console.log(OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
