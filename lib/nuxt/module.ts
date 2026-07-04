import { defineNuxtModule, addPlugin, addImports, createResolver } from '@nuxt/kit'
import { defu } from 'defu'
import {
  pickSerializableModuleOptions,
  warnUnsupportedModuleOptions,
  type ModuleOptions
} from './module-options'

export type { ModuleOptions }

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
    const existingOptions = nuxt.options.runtimeConfig.public.vueLiteLayer
    warnUnsupportedModuleOptions(existingOptions)
    warnUnsupportedModuleOptions(options)

    const serializableExistingOptions = pickSerializableModuleOptions(existingOptions)
    const serializableOptions = pickSerializableModuleOptions(options)

    nuxt.options.runtimeConfig.public.vueLiteLayer = defu(
      serializableExistingOptions,
      serializableOptions
    )

    addPlugin({
      src: resolver.resolve('./runtime/plugin'),
      mode: 'client'
    })

    nuxt.options.css = nuxt.options.css || []
    nuxt.options.css.push('vue-lite-layer/dist/vue-lite-layer.css')

    addImports([
      { name: 'useLiteLayer', from: 'vue-lite-layer' },
      { name: 'useLayerEvent', from: 'vue-lite-layer' }
    ])

    nuxt.options.build.transpile.push('vue-lite-layer')
  }
})
