import { describe, expect, test, vi } from 'vitest'

/**
 * Nuxt 模块 setup 的 CSS 注入开关。
 *
 * @nuxt/kit 在单元测试里没有 Nuxt 构建上下文，这里只保留模块定义本身，
 * 让 setup() 针对一个最小的 nuxt 对象执行。
 */
const kit = vi.hoisted(() => ({
  addPlugin: vi.fn(),
  addImports: vi.fn()
}))

vi.mock('@nuxt/kit', () => ({
  defineNuxtModule: (definition: unknown) => definition,
  createResolver: () => ({ resolve: (path: string) => path }),
  addPlugin: kit.addPlugin,
  addImports: kit.addImports
}))

import nuxtModule from '@lib/nuxt/module'

interface NuxtStub {
  options: {
    runtimeConfig: { public: Record<string, unknown> }
    css: string[]
    build: { transpile: string[] }
  }
}

const createNuxt = (): NuxtStub => ({
  options: {
    runtimeConfig: { public: {} },
    css: ['modern-normalize/modern-normalize.css'],
    build: { transpile: [] }
  }
})

const runSetup = (options: Record<string, unknown>, nuxt: NuxtStub) => {
  const module = nuxtModule as unknown as {
    setup: (options: Record<string, unknown>, nuxt: NuxtStub) => void
  }
  module.setup(options, nuxt)
}

describe('nuxt module setup', () => {
  test('injects the library stylesheet by default', () => {
    const nuxt = createNuxt()

    runSetup({}, nuxt)

    expect(nuxt.options.css).toContain('vue-lite-layer/dist/vue-lite-layer.css')
    expect(nuxt.options.build.transpile).toContain('vue-lite-layer')
  })

  test('skips the stylesheet when css is false', () => {
    const nuxt = createNuxt()

    runSetup({ css: false }, nuxt)

    expect(nuxt.options.css).not.toContain('vue-lite-layer/dist/vue-lite-layer.css')
  })

  test('keeps build-only options out of runtimeConfig', () => {
    const nuxt = createNuxt()

    runSetup({ css: false, shadeClose: false }, nuxt)

    expect(nuxt.options.runtimeConfig.public.vueLiteLayer).toMatchObject({
      shadeClose: false
    })
    expect(nuxt.options.runtimeConfig.public.vueLiteLayer).not.toHaveProperty('css')
  })
})
