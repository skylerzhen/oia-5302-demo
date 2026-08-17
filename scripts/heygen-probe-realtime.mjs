#!/usr/bin/env node
/**
 * Find avatars that work with Avatar Realtime (tries v3 looks + v2 streaming list).
 */
import { loadEnv } from '../server/load-env.mjs'
import {
  getHeyGenLook,
  listHeyGenPublicLooks,
  listHeyGenStreamingAvatarsV2,
  probeHeyGenRealtimeTts,
} from '../server/heygen-handlers.mjs'

async function tryProbe(label, avatarId, voiceId) {
  try {
    const result = await probeHeyGenRealtimeTts({ avatarId, voiceId, text: 'Realtime probe.' })
    console.log(`  ✅ ${label} · ${avatarId.slice(0, 8)}… → HLS ok`)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`  ❌ ${label} · ${avatarId.slice(0, 8)}… → ${message.split('\n')[0]}`)
    return null
  }
}

async function main() {
  loadEnv()
  console.log('\n🔎 HeyGen realtime avatar probe\n')

  const configured = process.env.HEYGEN_AVATAR_ID?.trim()
  if (configured) {
    const look = await getHeyGenLook(configured).catch(() => null)
    console.log('Configured look:', look?.name ?? configured, `(${look?.avatar_type ?? 'unknown'})`)
    await tryProbe('configured', configured, look?.default_voice_id)
  }

  console.log('\nPublic photo_avatar looks (first 3):')
  const photoLooks = await listHeyGenPublicLooks({ avatarType: 'photo_avatar', limit: 3 })
  for (const look of photoLooks) {
    await tryProbe(look.name ?? 'photo', look.id, look.default_voice_id)
  }

  console.log('\nPublic studio_avatar looks (first 3):')
  const studioLooks = await listHeyGenPublicLooks({ avatarType: 'studio_avatar', limit: 3 })
  for (const look of studioLooks) {
    await tryProbe(look.name ?? 'studio', look.id, look.default_voice_id)
  }

  console.log('\nv2 streaming avatars (first 3):')
  const v2 = await listHeyGenStreamingAvatarsV2()
  for (const avatar of v2.slice(0, 3)) {
    const id = avatar.avatar_id ?? avatar.id
    if (!id) continue
    await tryProbe(avatar.avatar_name ?? avatar.name ?? 'v2', id, avatar.default_voice_id)
  }

  console.log('\nIf all fail with resource_not_found, Avatar Realtime may not be enabled on this API key.')
  console.log('Contact HeyGen support or check https://www.heygen.com/api-pricing\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
