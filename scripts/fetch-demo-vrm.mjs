#!/usr/bin/env node
/**
 * Fetch VRoid AvatarSample_B (official pixiv sample, demo use).
 * Saves to public/avatar/oia-vroid-interviewer.vrm
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE =
  'https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_B.vrm'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TARGET = path.join(ROOT, 'public/avatar/oia-vroid-interviewer.vrm')

console.log('Downloading VRoid demo avatar…')
console.log(SOURCE)

const response = await fetch(SOURCE)
if (!response.ok) {
  console.error(`Download failed: ${response.status} ${response.statusText}`)
  process.exit(1)
}

const buffer = Buffer.from(await response.arrayBuffer())
await mkdir(path.dirname(TARGET), { recursive: true })
await writeFile(TARGET, buffer)

console.log(`Saved ${(buffer.length / 1024 / 1024).toFixed(1)} MB → ${TARGET}`)
console.log('License: VRoid Studio sample model — see public/avatar/README.md')
