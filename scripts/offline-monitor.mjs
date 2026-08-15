#!/usr/bin/env node
/**
 * Lightweight egress monitor for G1 offline rehearsal.
 * Run in a separate terminal while demo:offline is active.
 *
 * Usage:
 *   node scripts/offline-monitor.mjs
 *   node scripts/offline-monitor.mjs deliverables/demo-5302/evidence/offline-monitor.log
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const logPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'deliverables/demo-5302/evidence/offline-monitor.log')

const probes = [
  { label: 'google', url: 'https://www.google.com/generate_204' },
  { label: 'cloudflare', url: 'https://1.1.1.1/cdn-cgi/trace' },
  { label: 'openai', url: 'https://api.openai.com/v1/models' },
]

fs.mkdirSync(path.dirname(logPath), { recursive: true })
const stream = fs.createWriteStream(logPath, { flags: 'a' })

function write(line) {
  const stamped = `[${new Date().toISOString()}] ${line}\n`
  process.stdout.write(stamped)
  stream.write(stamped)
}

write('offline-monitor started')
write('Expected result after Wi-Fi disconnect: all probes fail or time out')

async function probeOnce() {
  for (const probe of probes) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      const response = await fetch(probe.url, { signal: controller.signal, redirect: 'manual' })
      write(`${probe.label}: REACHABLE status=${response.status}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      write(`${probe.label}: BLOCKED ${message}`)
    } finally {
      clearTimeout(timeout)
    }
  }
}

await probeOnce()
const timer = setInterval(probeOnce, 5000)

process.on('SIGINT', () => {
  write('offline-monitor stopped')
  clearInterval(timer)
  stream.end()
  process.exit(0)
})
