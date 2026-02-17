// @ts-expect-error - #imports is a Nuxt-specific import that only resolves in Nuxt environment
import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import VueLiteLayer from 'vue-lite-layer'

export default defineNuxtPlugin((nuxtApp: any) => {
  const config = useRuntimeConfig()
  const options = config.public.vueLiteLayer || {}
  nuxtApp.vueApp.use(VueLiteLayer, options)
})
