#!/usr/bin/env node
import { loadEnv } from '../server/load-env.mjs'
import { listLiveAvatarPublicAvatars } from '../server/liveavatar-handlers.mjs'

loadEnv()

try {
  const avatars = await listLiveAvatarPublicAvatars(30)
  if (!avatars.length) {
    console.log('No public LiveAvatar avatars returned.')
    process.exit(0)
  }

  console.log(`LiveAvatar public avatars (${avatars.length}):`)
  for (const avatar of avatars) {
    const id = avatar.id ?? avatar.avatar_id
    const name = avatar.name ?? avatar.display_name ?? 'Unnamed'
    console.log(`- ${name} · ${id}`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
