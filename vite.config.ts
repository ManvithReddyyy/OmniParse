import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/venv/**', '**/hf_space/**', '**/dist/**'],
    },
    proxy: {
      '/api/v1/extract': {
        target: 'http://localhost:7860',
        rewrite: (path) => path.replace(/^\/api\/v1\/extract/, '/v1/vision/analyze'),
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // Restrict Vite scanner strictly to the src directory (ignores python venv)
    entries: ['src/**/*.{ts,tsx,js,jsx}'],
  },
})
