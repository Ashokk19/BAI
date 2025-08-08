import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      crypto: 'crypto-js',
    },
  },
  optimizeDeps: {
    include: ['crypto-js'],
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
  esbuild: {
    target: 'es2020',
  },
})
