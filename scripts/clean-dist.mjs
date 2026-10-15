#!/usr/bin/env node
// Removes files that should NOT ship with the npm package but tend to land
// in `dist/` after `lib:build`. Acts as a safety net on top of the
// `stripNuxtDtsStragglers` plugin in `vite.config.lib.ts`, and additionally
// drops the favicon that Vite copies from `public/` into `dist/`.
//
// Paths are relative to the repository root (cwd).
import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const targets = [
  // Mirrors of `lib/**` emitted by `vite-plugin-dts` whenever the nuxt or
  // main sub-build runs with `entryRoot` rooted under `lib/`. Both are
  // byte-identical to the `dist/{components,composables,core,i18n,types,
  // LiteLayer.vue.d.ts,index.d.ts}` already shipped from the main build.
  'dist/lib',
  'dist/nuxt/lib',
  // Copies of the nuxt entry .d.ts files. The authoritative copies live
  // under `dist/nuxt/{module,module-options,runtime/plugin}.d.ts`.
  'dist/runtime',
  'dist/module.d.ts',
  'dist/module-options.d.ts',
  // Vite copies everything under `public/` into `dist/`, including the
  // favicon which is meant for the demo dev server, not the npm package.
  'dist/favicon.svg'
]

let removed = 0
for (const relative of targets) {
  const absolute = resolve(process.cwd(), relative)
  if (existsSync(absolute)) {
    rmSync(absolute, { recursive: true, force: true })
    console.log(`✓ removed ${relative}`)
    removed += 1
  }
}

if (removed === 0) {
  console.log('clean-dist: nothing to remove')
} else {
  console.log(`clean-dist: removed ${removed} path(s)`)
}
