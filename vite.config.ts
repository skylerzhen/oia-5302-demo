import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function cloudConnectSrc() {
  const apiUrl = process.env.VITE_LLM_API_URL?.trim()
  const liveKit = 'wss://*.livekit.cloud https://*.livekit.cloud wss://webrtc-signaling.heygen.io'
  if (!apiUrl) return `'self' ${liveKit}`
  try {
    return `'self' ${new URL(apiUrl).origin} ${liveKit}`
  } catch {
    return `'self' ${liveKit}`
  }
}

function cloudMediaSrc() {
  return `'self' blob: data:`
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-cloud-csp',
      transformIndexHtml(html) {
        const connectSrc = cloudConnectSrc()
        const mediaSrc = cloudMediaSrc()
        return html
          .replace(/connect-src 'self'/, `connect-src ${connectSrc}`)
          .replace(/media-src 'self' data:/, `media-src ${mediaSrc}`)
      },
    },
  ],
  preview: {
    allowedHosts: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
