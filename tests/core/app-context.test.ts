import { createApp, defineComponent, getCurrentInstance, h, nextTick } from 'vue'
import { describe, expect, test } from 'vitest'
import VueLiteLayer from '@lib/index'

describe('layer app context isolation', () => {
  test('layer-local plugins do not mutate host app globalProperties', async () => {
    const hostApp = createApp({ render: () => null })
    hostApp.config.globalProperties.$t = 'host translator'
    hostApp.use(VueLiteLayer, { banner: false })

    const instance = hostApp.config.globalProperties.$layer.open(
      { textContent: 'content', i18n: { locale: 'en' } },
      hostApp._context
    )

    expect(hostApp.config.globalProperties.$t).toBe('host translator')
    instance?.close()
    await new Promise((resolve) => setTimeout(resolve, 250))
  })

  test('layer content can read host globalProperties without mutating the host object', async () => {
    let renderedText = ''
    const Content = defineComponent({
      setup() {
        const instance = getCurrentInstance()
        renderedText = String(instance?.proxy?.$hostValue ?? '')
        return () => h('div', renderedText)
      }
    })

    const hostApp = createApp({ render: () => null })
    hostApp.config.globalProperties.$hostValue = 'from host'
    hostApp.use(VueLiteLayer, { banner: false })

    const instance = hostApp.config.globalProperties.$layer.open(
      { content: Content, i18n: { locale: 'en' } },
      hostApp._context
    )
    await nextTick()

    expect(renderedText).toBe('from host')
    expect(hostApp.config.globalProperties.$t).toBeUndefined()
    instance?.close()
    await new Promise((resolve) => setTimeout(resolve, 250))
  })
})
