#!/usr/bin/env node
/**
 * List HeyGen public avatar looks (copy an id into HEYGEN_AVATAR_ID).
 *
 *   node scripts/heygen-list-avatars.mjs
 */
import { loadEnv } from '../server/load-env.mjs'
import { listHeyGenPublicLooks } from '../server/heygen-handlers.mjs'

async function main() {
  loadEnv()
  const key = process.env.HEYGEN_API_KEY?.trim()
  if (!key) {
    console.error('\n❌ HEYGEN_API_KEY is not set in llm.env\n')
    process.exit(1)
  }

  console.log('\n🎭 HeyGen public avatar looks (first 20)\n')
  const looks = await listHeyGenPublicLooks()
  if (!looks.length) {
    console.log('No looks returned — check API key permissions.\n')
    process.exit(1)
  }

  for (const look of looks) {
    const id = look.id ?? look.avatar_id ?? look.look_id ?? '(unknown id)'
    const name = look.name ?? look.display_name ?? look.title ?? 'Unnamed'
    console.log(`  ${id}  ·  ${name}`)
  }

  console.log('\nCopy one id into llm.env:\n  HEYGEN_AVATAR_ID=<id>\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
