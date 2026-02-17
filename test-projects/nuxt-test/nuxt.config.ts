// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  
  modules: ['vue-lite-layer/nuxt'],

  vueLiteLayer: {
    // 全局配置
    shade: true,
    shadeClose: true,
    max: true,
    close: true
  }
})
