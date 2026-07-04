import { defineNuxtPlugin, useRuntimeConfig, type Plugin } from 'nuxt/app'
import VueLiteLayer from 'vue-lite-layer'
import type { App } from 'vue'
import type { ModuleOptions } from '../module-options'

interface LiteLayerNuxtApp {
  vueApp: App
}

const plugin: Plugin = defineNuxtPlugin((nuxtApp: LiteLayerNuxtApp) => {
  const config = useRuntimeConfig()
  const options = (config.public.vueLiteLayer || {}) as ModuleOptions
  nuxtApp.vueApp.use(VueLiteLayer, options)
})

export default plugin
