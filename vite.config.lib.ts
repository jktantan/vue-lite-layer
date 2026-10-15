import { copyFileSync, existsSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import dts from 'vite-plugin-dts'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import loadVersion from 'vite-plugin-package-version'
import { resolve } from 'path'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

const sfcTypeResolverFs = {
  fileExists: existsSync,
  readFile: (file: string) => readFileSync(file, 'utf-8'),
  realpath: realpathSync
}

const copyLegacyStyleEntry = (): Plugin => ({
  name: 'copy-legacy-style-entry',
  closeBundle() {
    const source = resolve(projectRoot, 'dist/vue-lite-layer.css')
    const target = resolve(projectRoot, 'dist/style.css')
    if (existsSync(source)) {
      copyFileSync(source, target)
    }
  }
})

/**
 * Removes declaration-file leftovers that `vite-plugin-dts` historically
 * dumped when invoked with `entryRoot: 'lib/nuxt'`. The nuxt sub-build is
 * supposed to land in `dist/nuxt/{module,module-options,runtime}.{mjs,d.ts}`
 * only, but the plugin still emits duplicate copies of the `lib/` tree
 * under both `dist/lib/**` AND `dist/nuxt/lib/**`, plus stray copies of
 * the nuxt entry .d.ts files at `dist/runtime/plugin.d.ts`,
 * `dist/module.d.ts` and `dist/module-options.d.ts`. The `dist/nuxt/lib/**`
 * mirror is especially misleading because it lives *inside* the nuxt
 * sub-tree, where consumers reasonably expect anything they see to be
 * referenced by `dist/nuxt/module.d.ts` — and it isn't.
 */
const stripNuxtDtsStragglers = (): Plugin => ({
  name: 'strip-nuxt-dts-stragglers',
  closeBundle() {
    const stale: string[] = [
      // Mirror of `lib/**` planted at `dist/` and `dist/nuxt/`. Both are
      // byte-identical to the `dist/{components,composables,core,i18n,types,
      // LiteLayer.vue.d.ts,index.d.ts}` already shipped from the main build.
      'dist/lib',
      'dist/nuxt/lib',
      // Copies of the nuxt entry .d.ts files. Authoritative copies live
      // under `dist/nuxt/{module,module-options,runtime}.d.ts`.
      'dist/runtime/plugin.d.ts',
      'dist/module.d.ts',
      'dist/module-options.d.ts'
    ]
    for (const relative of stale) {
      const absolute = resolve(projectRoot, relative)
      if (existsSync(absolute)) {
        rmSync(absolute, { recursive: true, force: true })
      }
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
      ...(isNuxtBuild
        ? [stripNuxtDtsStragglers()]
        : [copyLegacyStyleEntry()]),
      dts({
        insertTypesEntry: !isNuxtBuild,
        tsconfigPath: 'tsconfig.lib.json',
        outDirs: isNuxtBuild ? 'dist/nuxt' : 'dist',
        entryRoot: isNuxtBuild ? 'lib/nuxt' : 'lib'
        // NOTE: deliberately not narrowing `include` / `exclude` here. In
        // unplugin-dts v1 these only filter which files become entry points;
        // they do NOT change the tsconfig scope, so values like
        // `exclude: ['lib/**/*.ts']` cause TS6307 ("file not listed in
        // project") for any transitive import under lib/. The duplicate
        // declaration files this build emits into `dist/` (e.g.
        // `dist/lib/...`, `dist/nuxt/lib/...`, `dist/runtime/plugin.d.ts`,
        // `dist/module.d.ts`, `dist/module-options.d.ts`) are pure
        // leftovers and are removed by the `stripNuxtDtsStragglers` plugin
        // after the bundle closes.
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
              module: resolve(projectRoot, 'lib/nuxt/module.ts'),
              'runtime/plugin': resolve(projectRoot, 'lib/nuxt/runtime/plugin.ts')
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
            entry: resolve(projectRoot, 'lib/index.ts'),
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
