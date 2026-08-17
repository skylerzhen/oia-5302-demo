#!/usr/bin/env node
/**
 * Surge free tier blocks PDF hosting. Generate HTML views for controlled docs
 * so "Open source" links work on https://oia-rfq-5302.surge.sh
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CV_SOURCE = path.join(ROOT, 'data/issue-5302-inputs/cv-source')
const TARGET = path.join(ROOT, 'public/issue-5302-inputs')

const documents = [
  ['01-sara-al-hinai-en.md', '01-sara-al-hinai-en.html'],
  ['02-khalid-al-balushi-en.md', '02-khalid-al-balushi-en.html'],
  ['03-lina-al-abri-bilingual.md', '03-lina-al-abri-bilingual.html'],
  ['04-noor-al-hashmi-ar-scan.md', '04-noor-al-hashmi-ar-scan.html', true],
  ['05-yusuf-al-rashdi-en.md', '05-yusuf-al-rashdi-en.html'],
  ['06-omar-al-saidi-ar.md', '06-omar-al-saidi-ar.html'],
  ['06-sara-v2-update.md', '07-sara-v2-update.html'],
]

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function inlineMarkdown(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function markdownHtml(markdown) {
  const lines = markdown.split('\n')
  const parts = []
  let inList = false

  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (inList) { parts.push('</ul>'); inList = false }
      parts.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`)
      continue
    }
    if (line.startsWith('## ')) {
      if (inList) { parts.push('</ul>'); inList = false }
      parts.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`)
      continue
    }
    if (line.startsWith('- ')) {
      if (!inList) { parts.push('<ul>'); inList = true }
      parts.push(`<li>${inlineMarkdown(line.slice(2))}</li>`)
      continue
    }
    if (line.startsWith('|')) {
      if (inList) { parts.push('</ul>'); inList = false }
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
      if (cells.every((cell) => /^-+:?$/.test(cell))) continue
      parts.push(`<p class="table-line">${cells.map(inlineMarkdown).join(' · ')}</p>`)
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      if (!inList) { parts.push('<ol>'); inList = true }
      parts.push(`<li>${inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</li>`)
      continue
    }
    if (!line.trim()) {
      if (inList) { parts.push('</ul>'); inList = false }
      parts.push('<div class="gap"></div>')
      continue
    }
    if (inList) { parts.push('</ul>'); inList = false }
    parts.push(`<p>${inlineMarkdown(line)}</p>`)
  }

  if (inList) parts.push('</ul>')
  return parts.join('\n')
}

function pageHtml(title, body, scanned = false) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · OIA 5302 controlled input</title>
  <style>
    :root { color-scheme: light; }
    body {
      font-family: Arial, "Noto Sans Arabic", sans-serif;
      color: #172033;
      line-height: 1.55;
      font-size: 11pt;
      max-width: 820px;
      margin: 0 auto;
      padding: 24px 20px 48px;
      background: #f8fafc;
    }
    main {
      background: #fff;
      border: 1px solid #dbe4ee;
      border-radius: 12px;
      padding: 28px 32px;
      box-shadow: 0 8px 24px rgba(15, 61, 99, 0.06);
    }
    .banner {
      font-size: 10pt;
      color: #475569;
      margin-bottom: 18px;
      padding: 10px 12px;
      background: #eff6ff;
      border-radius: 8px;
    }
    .banner a { color: #0f766e; font-weight: 700; }
    h1 { color: #0f3d63; font-size: 21pt; margin: 0 0 0.2em; }
    h2 { color: #0f766e; font-size: 13pt; border-bottom: 1px solid #d6e4ef; padding-bottom: 4px; margin: 1.1em 0 0.4em; }
    p { margin: 0.35em 0; }
    li { margin: 0.25em 0; }
    .gap { height: 0.35em; }
    .table-line { padding: 5px 7px; background: #f1f5f9; font-size: 9.5pt; border-radius: 4px; }
    ${scanned ? 'main { background: #f3efe5; color: #292721; filter: contrast(.92) grayscale(.35); } h1, h2 { color: #292721; }' : ''}
  </style>
</head>
<body>
  <main>
    <p class="banner">OIA RFQ 5302 · Synthetic controlled input · HTML view (Surge-compatible) · <a href="/">← Back to demo home</a></p>
    ${body}
  </main>
</body>
</html>`
}

function writeHtml(markdownPath, outName, scanned = false) {
  const markdown = fs.readFileSync(path.join(CV_SOURCE, markdownPath), 'utf8').trim()
  const title = markdown.match(/^#\s+(.+)/m)?.[1] ?? outName
  const html = pageHtml(title, markdownHtml(markdown), scanned)
  fs.writeFileSync(path.join(TARGET, outName), html)
  console.log(`✓ public/issue-5302-inputs/${outName}`)
}

function main() {
  fs.mkdirSync(TARGET, { recursive: true })
  for (const [source, target, scanned] of documents) {
    writeHtml(source, target, scanned)
  }

  const assessment = fs.readFileSync(
    path.join(ROOT, 'data/issue-5302-inputs/assessment-question-bank.md'),
    'utf8',
  ).trim()
  const assessmentHtml = pageHtml('Assessment question bank', markdownHtml(assessment))
  fs.writeFileSync(path.join(TARGET, '08-assessment-question-bank.html'), assessmentHtml)
  console.log('✓ public/issue-5302-inputs/08-assessment-question-bank.html')
}

main()
