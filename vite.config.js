import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: 'electron/main.cjs',
    }),
  ],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['electron', 'better-sqlite3', 'path', 'fs', 'os']
    }
  },
  server: { 
    port: 5173,
    strictPort: true
  }
})