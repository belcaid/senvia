/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@capacitor-community/sqlite') || id.includes('node_modules/jeep-sqlite')) {
            return 'sqlite'
          }

          if (id.includes('node_modules/@ionic') || id.includes('node_modules/ionicons')) {
            return 'ionic'
          }

          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia')) {
            return 'vue'
          }

          if (id.includes('node_modules/gsap')) {
            return 'animations'
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
