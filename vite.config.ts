import { fileURLToPath, URL } from 'node:url'
import { existsSync, readFileSync, realpathSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import loadVersion from 'vite-plugin-package-version'

const sfcTypeResolverFs = {
  fileExists: existsSync,
  readFile: (file: string) => readFileSync(file, 'utf-8'),
  realpath: realpathSync
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({ script: { fs: sfcTypeResolverFs } }),
    vueJsx(),
    loadVersion(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@lib': fileURLToPath(new URL('./lib', import.meta.url))
    }
  },
  build: {
    outDir: 'node_modules/.tmp/dist-app'
  }
})
