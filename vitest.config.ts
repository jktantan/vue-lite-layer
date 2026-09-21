import { fileURLToPath, URL } from 'node:url'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// Vue 3.5 resolves imported types in <script setup> through this adapter.
// The library build already has it; tests must use the same compiler setup.
const sfcTypeResolverFs = {
  fileExists: existsSync,
  readFile: (file: string) => readFileSync(file, 'utf-8'),
  realpath: realpathSync
}

export default defineConfig({
  plugins: [vue({ script: { fs: sfcTypeResolverFs } })],
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
