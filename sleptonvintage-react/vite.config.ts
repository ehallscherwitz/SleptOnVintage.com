import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Plain `vite` does not run Vercel serverless routes. Set DEV_PROXY_API_TARGET in .env.local
// (e.g. https://your-app.vercel.app) so /api/* is proxied while you develop locally.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = (env.DEV_PROXY_API_TARGET || '').trim().replace(/\/$/, '')

  return {
    plugins: [react()],
    ...(apiTarget
      ? {
          server: {
            proxy: {
              '/api': {
                target: apiTarget,
                changeOrigin: true,
                secure: true,
              },
            },
          },
        }
      : {}),
  }
})
