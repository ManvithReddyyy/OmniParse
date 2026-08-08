import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: {
      ignored: ['**/venv/**', '**/hf_space/**', '**/dist/**'],
    },
    proxy: {
      '/api/v1/extract': {
        target: 'http://localhost:7860',
        rewrite: (p) => p.replace(/^\/api\/v1\/extract/, '/v1/vision/analyze'),
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // Restrict Vite scanner strictly to the src directory (ignores python venv)
    entries: ['src/**/*.{ts,tsx,js,jsx}'],
  },
})

