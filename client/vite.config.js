import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward all /api requests to backend — no CORS issues
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/interview': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  }
})
