#!/usr/bin/env node
/**
 * Extract Cursor chat user messages into docs/progress/ for Git sync.
 * Raw index + per-day snippets; Agent curates full summaries on 收工.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PROGRESS = path.join(ROOT, 'docs/progress')
const TZ = 'Asia/Shanghai'

function projectSlug() {
  const normalized = ROOT.replace(/\\/g, '/').replace(/^\/Users\/[^/]+/, '')
  return normalized.replace(/^\//, '').replace(/\//g, '-').replace(/\./g, '') || 'workspace'
}

function cursorTranscriptDir() {
  const home = os.homedir()
  const slug = projectSlug()
  const candidates = [
    path.join(home, '.cursor/projects', slug, 'agent-transcripts'),
    path.join(home, '.cursor/projects', `Users-admin-${slug}`, 'agent-transcripts'),
  ]
  // oia-5302-demo lives under Downloads
  if (ROOT.includes('oia-5302-demo')) {
    candidates.unshift(
      path.join(home, '.cursor/projects/Users-admin-Downloads-oia-5302-demo/agent-transcripts'),
    )
  }
  if (ROOT.includes('huafeng-ai-brain')) {
    candidates.unshift(
      path.join(home, '.cursor/projects/Users-admin-Projects-huafeng-ai-brain/agent-transcripts'),
    )
  }
  if (ROOT.includes('shuangmu-ai-brain-demo')) {
    candidates.unshift(
      path.join(home, '.cursor/projects/Users-admin-Projects-shuangmu-ai-brain-demo/agent-transcripts'),
    )
  }
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir
  }
  return null
}

function findMainTranscripts(dir) {
  if (!dir) return []
  const results = []
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory() && entry.name !== 'subagents') walk(full)
      else if (entry.isFile() && entry.name.endsWith('.jsonl') && !full.includes('/subagents/')) {
        results.push(full)
      }
    }
  }
  walk(dir)
  return results.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
}

function parseTimestamp(text) {
  const m = text.match(/<timestamp>([^<]+)<\/timestamp>/)
  if (!m) return null
  const d = new Date(m[1])
  return Number.isNaN(d.getTime()) ? null : d
}

function dateKeyInShanghai(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function extractUserQuery(text) {
  const q = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/)
  if (q) return q[1].trim()
  return text.replace(/<timestamp>[^<]+<\/timestamp>\s*/g, '').trim()
}

function loadEntries(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
  const entries = []
  for (const line of lines) {
    try {
      const row = JSON.parse(line)
      if (row.role !== 'user') continue
      const text = row.message?.content?.find((c) => c.type === 'text')?.text ?? ''
      if (!text || text.includes('You are the forked subagent')) continue
      const ts = parseTimestamp(text)
      const query = extractUserQuery(text)
      if (!query || query.length < 2) continue
      entries.push({ ts: ts ?? new Date(0), query, source: path.basename(file, '.jsonl') })
    } catch {
      // skip malformed
    }
  }
  return entries
}

function groupByDate(entries) {
  const map = new Map()
  for (const e of entries) {
    const key = e.ts.getTime() > 0 ? dateKeyInShanghai(e.ts) : 'unknown-date'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(e)
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.ts - b.ts)
  }
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

function writeIndex(grouped, transcriptFiles) {
  fs.mkdirSync(PROGRESS, { recursive: true })
  const lines = [
    '# Cursor 对话索引（自动生成）',
    '',
    `> 生成时间：${new Intl.DateTimeFormat('zh-CN', { timeZone: TZ, dateStyle: 'full', timeStyle: 'medium' }).format(new Date())}`,
    `> 来源：\`${transcriptFiles.join('`, `')}\``,
    '',
    '收工时 Agent 会据此写 **决策摘要** 进 `docs/daily-logs/`。原始 jsonl 不在 Git 里。',
    '',
  ]

  for (const [date, items] of grouped) {
    lines.push(`## ${date}`, '')
    items.forEach((item, i) => {
      const time = item.ts.getTime() > 0
        ? new Intl.DateTimeFormat('zh-CN', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(item.ts)
        : '??:??'
      const preview = item.query.replace(/\s+/g, ' ').slice(0, 200)
      lines.push(`${i + 1}. **${time}** — ${preview}${item.query.length > 200 ? '…' : ''}`)
    })
    lines.push('')
  }

  fs.writeFileSync(path.join(PROGRESS, 'cursor-transcript-index.md'), lines.join('\n'))
  console.log(`✓ docs/progress/cursor-transcript-index.md (${[...grouped.values()].flat().length} user messages)`)
}

function main() {
  const dir = cursorTranscriptDir()
  const files = findMainTranscripts(dir)
  if (!files.length) {
    console.warn('No Cursor transcripts found for this project.')
    console.warn('Expected under ~/.cursor/projects/.../agent-transcripts/')
    process.exit(0)
  }

  const all = files.flatMap(loadEntries)
  const grouped = groupByDate(all)
  writeIndex(grouped, files.map((f) => path.relative(os.homedir(), f)))
}

main()
