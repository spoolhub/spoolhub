import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://localhost:7276',
        secure: false,
      },
      '/hubs': {
        target: 'https://localhost:7276',
        ws: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      onwarn: (warning, warn) => {
        if (warning.code === 'INVALID_ANNOTATION') {
          return;
        }
        warn(warning);
      },
    },
  }
})
