import { fileURLToPath, URL } from 'node:url'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import loadVersion from 'vite-plugin-package-version'
import { resolve } from 'path'
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vueJsx(),
    loadVersion(),
    dts({ insertTypesEntry: true, tsconfigPath: 'tsconfig.lib.json' })
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },
  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('./lib', import.meta.url))
    }
  },
  esbuild: {
    // 暂时保留 console 用于调试
    drop: [] // mode === 'production' ? ['console', 'debugger'] : []
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/index.ts'),
      name: 'vue-lite-layer',
      fileName: (format) => `vue-lite-layer.${format}.js`
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
}))
