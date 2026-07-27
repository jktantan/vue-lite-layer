import { copyFileSync, existsSync, readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import loadVersion from 'vite-plugin-package-version'
import { resolve } from 'path'

const sfcTypeResolverFs = {
  fileExists: existsSync,
  readFile: (file: string) => readFileSync(file, 'utf-8'),
  realpath: realpathSync
}

const copyLegacyStyleEntry = () => ({
  name: 'copy-legacy-style-entry',
  closeBundle() {
    const source = resolve(__dirname, 'dist/vue-lite-layer.css')
    const target = resolve(__dirname, 'dist/style.css')
    if (existsSync(source)) {
      copyFileSync(source, target)
    }
  }
})

export default defineConfig(({ mode }) => {
  const isNuxtBuild = mode === 'nuxt'

  return {
    plugins: [
      vue({ script: { fs: sfcTypeResolverFs } }),
      vueJsx(),
      loadVersion(),
      ...(isNuxtBuild ? [] : [copyLegacyStyleEntry()]),
      dts({
        insertTypesEntry: !isNuxtBuild,
        tsconfigPath: 'tsconfig.lib.json',
        outDir: isNuxtBuild ? 'dist/nuxt' : 'dist',
        entryRoot: isNuxtBuild ? 'lib/nuxt' : 'lib'
      })
    ],
    resolve: {
      alias: {
        '@lib': fileURLToPath(new URL('./lib', import.meta.url))
      }
    },
    esbuild: {
      drop: []
    },
    build: isNuxtBuild
      ? {
          lib: {
            entry: {
              module: resolve(__dirname, 'lib/nuxt/module.ts'),
              'runtime/plugin': resolve(__dirname, 'lib/nuxt/runtime/plugin.ts')
            },
            formats: ['es'],
            fileName: (_format, entryName) => `nuxt/${entryName}.mjs`
          },
          rollupOptions: {
            external: ['@nuxt/kit', 'defu', 'vue-lite-layer', 'nuxt/app']
          },
          emptyOutDir: false
        }
      : {
          lib: {
            entry: resolve(__dirname, 'lib/index.ts'),
            name: 'vue-lite-layer',
            fileName: (format) => `vue-lite-layer.${format}.js`
          },
          rollupOptions: {
            external: ['vue'],
            output: {
              globals: {
                vue: 'Vue'
              }
            }
          }
        }
  }
})
