#!/usr/bin/env node
/** Thin wrapper → mux-natural.mjs (no speed change). */
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'mux-natural.mjs')
const r = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(r.status ?? 1)
