import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function cloudConnectSrc() {
  const apiUrl = process.env.VITE_LLM_API_URL?.trim()
  if (!apiUrl) return `'self'`
  try {
    return `'self' ${new URL(apiUrl).origin}`
  } catch {
    return `'self'`
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-cloud-csp',
      transformIndexHtml(html) {
        const connectSrc = cloudConnectSrc()
        return html.replace(
          /connect-src 'self'/,
          `connect-src ${connectSrc}`,
        )
      },
    },
  ],
  preview: {
    allowedHosts: true,
  },
  server: {
    proxy: {
      '/api/local-ai': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
