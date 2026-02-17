import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('../../lib', import.meta.url)),
      'vue-lite-layer': fileURLToPath(new URL('../../lib/index.ts', import.meta.url)),
      'vue-lite-layer/dist/vue-lite-layer.css': fileURLToPath(
        new URL('../../dist/vue-lite-layer.css', import.meta.url)
      )
    }
  },
  server: {
    port: 5174
  }
})
