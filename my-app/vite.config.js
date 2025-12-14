import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es', // ES module format for Web Workers
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'], // Exclude from pre-bundling
  },
  build: {
    target: 'esnext', // For WebGPU support
  },
  server: {
    port: 3000,
    open: true,
  },
})
