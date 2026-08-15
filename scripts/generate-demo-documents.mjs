#!/usr/bin/env node
/**
 * Generate the synthetic S1 CV input pack:
 * - English PDF
 * - English DOCX
 * - Bilingual PDF
 * - Arabic scan-style PDF (image-only)
 * - Weak-match PDF
 * - Sara's update PDF for S2
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { Document, Packer, Paragraph, TextRun } from 'docx'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(ROOT, 'data/issue-5302-inputs/cv-source')
const OUT = path.join(ROOT, 'data/issue-5302-inputs/files')

const documents = [
  ['01-sara-al-hinai-en.md', '01-sara-al-hinai-en.pdf', 'pdf'],
  ['02-khalid-al-balushi-en.md', '02-khalid-al-balushi-en.docx', 'docx'],
  ['03-lina-al-abri-bilingual.md', '03-lina-al-abri-bilingual.pdf', 'pdf'],
  ['04-noor-al-hashmi-ar-scan.md', '04-noor-al-hashmi-ar-scan.pdf', 'scan'],
  ['05-yusuf-al-rashdi-en.md', '05-yusuf-al-rashdi-en.pdf', 'pdf'],
  ['06-omar-al-saidi-ar.md', '06-omar-al-saidi-ar.pdf', 'pdf'],
  ['06-sara-v2-update.md', '07-sara-v2-update.pdf', 'pdf'],
]

function sourceText(file) {
  return fs.readFileSync(path.join(SOURCE, file), 'utf8').trim()
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function markdownHtml(markdown) {
  return markdown.split('\n').map((line) => {
    if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`
    if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`
    if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`
    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((cell) => escapeHtml(cell.trim()))
      if (cells.every((cell) => /^-+:?$/.test(cell))) return ''
      return `<p class="table-line">${cells.join(' · ')}</p>`
    }
    if (!line.trim()) return '<div class="gap"></div>'
    return `<p>${escapeHtml(line).replaceAll('**', '')}</p>`
  }).join('\n')
}

function documentHtml(markdown, scanned = false) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, "Noto Sans Arabic", sans-serif; color: #172033; line-height: 1.55; font-size: 11pt; }
    h1 { color: #0f3d63; font-size: 21pt; margin: 0 0 0.2em; }
    h2 { color: #0f766e; font-size: 13pt; border-bottom: 1px solid #d6e4ef; padding-bottom: 4px; margin: 1.1em 0 0.4em; }
    p { margin: 0.35em 0; } li { margin: 0.25em 0; }
    .gap { height: 0.35em; } .table-line { padding: 5px 7px; background: #f1f5f9; font-size: 9.5pt; }
    ${scanned ? 'body { background: #f3efe5; color: #292721; filter: contrast(.88) grayscale(.72); transform: rotate(-.15deg); } h1,h2 { color: #292721; }' : ''}
  </style><body>${markdownHtml(markdown)}</body></html>`
}

async function makePdf(browser, markdown, filename) {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } })
  await page.setContent(documentHtml(markdown), { waitUntil: 'load' })
  await page.pdf({ path: path.join(OUT, filename), format: 'A4', printBackground: true })
  await page.close()
}

async function makeScanPdf(browser, markdown, filename) {
  const sourcePage = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1.5 })
  await sourcePage.setContent(documentHtml(markdown, true), { waitUntil: 'load' })
  const imagePath = path.join(OUT, '.noor-ar-scan.png')
  await sourcePage.screenshot({ path: imagePath, fullPage: true, type: 'png' })
  await sourcePage.close()

  const pdfPage = await browser.newPage()
  const imageData = fs.readFileSync(imagePath).toString('base64')
  await pdfPage.setContent(
    `<!doctype html><style>@page{size:A4;margin:0}body{margin:0}img{width:100%;height:auto;display:block}</style><img src="data:image/png;base64,${imageData}">`,
    { waitUntil: 'load' },
  )
  await pdfPage.pdf({ path: path.join(OUT, filename), format: 'A4', printBackground: true })
  await pdfPage.close()
  fs.unlinkSync(imagePath)
}

async function makeDocx(markdown, filename) {
  const children = markdown.split('\n').filter(Boolean).map((line) => {
    const heading = line.match(/^(#{1,2})\s+(.*)$/)
    if (heading) {
      return new Paragraph({
        heading: heading[1].length === 1 ? 'TITLE' : 'HEADING_1',
        children: [new TextRun(heading[2])],
      })
    }
    if (line.startsWith('- ')) return new Paragraph({ text: line.slice(2), bullet: { level: 0 } })
    if (line.startsWith('|')) return new Paragraph({ text: line.split('|').slice(1, -1).map((cell) => cell.trim()).join(' | ') })
    return new Paragraph({ text: line.replaceAll('**', '') })
  })
  const document = new Document({ sections: [{ children }] })
  fs.writeFileSync(path.join(OUT, filename), await Packer.toBuffer(document))
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const [source, target, type] of documents) {
      const markdown = sourceText(source)
      if (type === 'docx') await makeDocx(markdown, target)
      else if (type === 'scan') await makeScanPdf(browser, markdown, target)
      else await makePdf(browser, markdown, target)
      console.log(`✓ ${target}`)
    }
    await makePdf(
      browser,
      fs.readFileSync(path.join(ROOT, 'data/issue-5302-inputs/assessment-question-bank.md'), 'utf8'),
      '08-assessment-question-bank.pdf',
    )
    console.log('✓ 08-assessment-question-bank.pdf')
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
