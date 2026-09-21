import {
  createApp,
  defineComponent,
  getCurrentInstance,
  h,
  inject,
  nextTick,
  provide,
  ref,
  watchEffect
} from 'vue'
import { describe, expect, test } from 'vitest'
import VueLiteLayer from '@lib/index'
import useLiteLayer from '@lib/composables/use-lite-layer'
import type { LayerInstance } from '@lib/types/instance'
import layerManager from '@lib/core/layer-manager'

describe('layer app context isolation', () => {
  test('cleans Teleport DOM and manager state when mounting a layer fails', () => {
    layerManager.resetForTest()
    const target = document.createElement('section')
    document.body.append(target)
    const hostApp = createApp({ render: () => null })
    hostApp.config.errorHandler = (error) => {
      throw error
    }
    hostApp.use(VueLiteLayer, { banner: false })

    expect(() =>
      hostApp.config.globalProperties.$layer.open(
        {
          teleport: target,
          uniqueGroup: 'mount-failure',
          onOpen: () => {
            throw new Error('mount failed')
          }
        },
        hostApp._context
      )
    ).toThrow('mount failed')

    expect(target.querySelector('[role="dialog"]')).toBeNull()
    expect(layerManager.has('mount-failure')).toBe(false)
    hostApp.unmount()
  })

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

  test('useLiteLayer inherits component-scoped provides and their reactive updates', async () => {
    const locale = ref('zh-CN')
    let renderedLocale = ''
    let layerInstance: LayerInstance | null = null

    const Content = defineComponent({
      setup() {
        const injectedLocale = inject<typeof locale>('element-plus-config')!
        watchEffect(() => {
          renderedLocale = injectedLocale.value
        })
        return () => h('div', renderedLocale)
      }
    })

    const Caller = defineComponent({
      setup() {
        provide('element-plus-config', locale)
        const { openLayer } = useLiteLayer()
        return () =>
          h('button', {
            onClick: () => {
              layerInstance = openLayer({ content: Content, i18n: { locale: 'en' } })
            }
          })
      }
    })

    const host = document.createElement('div')
    document.body.appendChild(host)
    const hostApp = createApp(Caller)
    hostApp.use(VueLiteLayer, { banner: false })
    hostApp.mount(host)

    ;(host.querySelector('button') as HTMLButtonElement).click()
    await nextTick()
    expect(renderedLocale).toBe('zh-CN')

    locale.value = 'en'
    await nextTick()
    expect(renderedLocale).toBe('en')

    layerInstance?.close()
    await new Promise((resolve) => setTimeout(resolve, 250))
    hostApp.unmount()
    host.remove()
  })
})
