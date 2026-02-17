import { defineNuxtModule, addPlugin, addImports, createResolver } from '@nuxt/kit'
import { defu } from 'defu'
import type { LayerGlobalConfig } from '../types/layer'

export type ModuleOptions = LayerGlobalConfig

/**
 * vue-lite-layer Nuxt 模块
 *
 * 使用方式：在 nuxt.config.ts 中添加
 * ```ts
 * export default defineNuxtConfig({
 *   modules: ['vue-lite-layer/nuxt'],
 *   vueLiteLayer: {
 *     // 全局配置（可选）
 *   }
 * })
 * ```
 *
 * 模块功能：
 * - 自动注册 vue-lite-layer 为客户端插件
 * - 自动导入 useLiteLayer / useLayerEvent composables
 * - 自动导入 CSS 样式
 * - 将库代码加入 Nuxt 转译列表
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'vue-lite-layer',
    configKey: 'vueLiteLayer',
    compatibility: {
      nuxt: '>=3.0.0'
    }
  },
  defaults: {},
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // 使用 defu 合并用户配置，避免覆盖已有的 runtimeConfig
    nuxt.options.runtimeConfig.public.vueLiteLayer = defu(
      (nuxt.options.runtimeConfig.public.vueLiteLayer as Record<string, unknown>) || {},
      options
    )

    // 注册客户端插件（弹层依赖 DOM，仅在客户端运行）
    addPlugin({
      src: resolver.resolve('./runtime/plugin'),
      mode: 'client'
    })

    // 自动导入 CSS 样式
    nuxt.options.css = nuxt.options.css || []
    nuxt.options.css.push('vue-lite-layer/dist/vue-lite-layer.css')

    // 自动导入 composables，在 Nuxt 项目中无需手动 import
    addImports([
      { name: 'useLiteLayer', from: 'vue-lite-layer' },
      { name: 'useLayerEvent', from: 'vue-lite-layer' }
    ])

    // 确保库代码被 Nuxt 正确转译
    nuxt.options.build.transpile.push('vue-lite-layer')
  }
})
