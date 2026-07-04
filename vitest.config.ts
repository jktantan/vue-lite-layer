import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('./lib', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['lib/**/*.{ts,vue}'],
      exclude: ['lib/**/*.d.ts', 'lib/assets/**']
    }
  }
})
