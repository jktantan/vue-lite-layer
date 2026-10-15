import { defineNuxtPlugin, useRuntimeConfig, type NuxtApp, type Plugin } from 'nuxt/app'
import VueLiteLayer from 'vue-lite-layer'
import type { ModuleOptions } from '../module-options'

const plugin: Plugin = defineNuxtPlugin((nuxtApp: NuxtApp) => {
  const config = useRuntimeConfig()
  const options = (config.public.vueLiteLayer || {}) as ModuleOptions
  nuxtApp.vueApp.use(VueLiteLayer, options)
})

export default plugin
