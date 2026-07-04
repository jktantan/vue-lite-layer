import mitt from 'mitt'
import { createApp } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import LiteLayer from '@lib/LiteLayer.vue'
import VueLiteLayer from '@lib/index'
import layerManager from '@lib/core/layer-manager'
import { createLayerEmitterPlugin } from '@lib/core/layer-emitter'
import type { LayerEvents } from '@lib/core/layer-events'

const mountLayer = () => {
  const emitter = mitt<LayerEvents>()
  const wrapper = mount(LiteLayer, {
    attachTo: document.body,
    props: {
      id: 'test-layer',
      title: 'Test Layer',
      teleport: 'body',
      content: 'content'
    },
    global: {
      plugins: [createLayerEmitterPlugin(emitter)]
    }
  })

  return { wrapper, emitter }
}

describe('LiteLayer', () => {
  test('renders dialog semantics and labelled title', async () => {
    const { wrapper } = mountLayer()
    await wrapper.vm.$nextTick()

    const dialog = document.body.querySelector('[role="dialog"]')

    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy()
  })

  test('emits unmount even when leave animationend is missing', async () => {
    vi.useFakeTimers()
    const { emitter } = mountLayer()
    const unmount = vi.fn()

    emitter.on('unmount', unmount)
    emitter.emit('close')
    vi.advanceTimersByTime(250)

    expect(unmount).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  test('footer buttons are non-submit buttons', async () => {
    const { wrapper } = mountLayer()
    await wrapper.vm.$nextTick()

    const buttons = [...document.body.querySelectorAll('button.lite-layer__button')]

    expect(buttons).toHaveLength(2)
    expect(buttons.every((button) => button.getAttribute('type') === 'button')).toBe(true)
  })

  test('default footer buttons emit empty payloads instead of native click events', async () => {
    const { wrapper, emitter } = mountLayer()
    const cancel = vi.fn()
    const ok = vi.fn()
    emitter.on('cancel', cancel)
    emitter.on('ok', ok)
    await wrapper.vm.$nextTick()

    const buttons = [...document.body.querySelectorAll('button.lite-layer__button')]
    buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(cancel).toHaveBeenCalledWith(undefined)
    expect(ok).toHaveBeenCalledWith(undefined)
  })

  test('renders non-body teleport inside the target container', async () => {
    const target = document.createElement('section')
    target.id = 'local-layer-target'
    target.style.position = 'relative'
    document.body.append(target)

    const emitter = mitt<LayerEvents>()
    mount(LiteLayer, {
      props: {
        id: 'local-layer',
        title: 'Local Layer',
        teleport: '#local-layer-target',
        content: 'local content'
      },
      global: {
        plugins: [createLayerEmitterPlugin(emitter)]
      }
    })
    await new Promise(requestAnimationFrame)

    const layer = target.querySelector('.lite-layer') as HTMLElement | null

    expect(layer).not.toBeNull()
    expect(layer?.style.position).toBe('absolute')
    expect(target.querySelector('[role="dialog"]')).not.toBeNull()
  })

  test('open closes and cleans HTMLElement teleport layers', async () => {
    vi.useFakeTimers()
    layerManager.resetForTest()
    const target = document.createElement('section')
    document.body.append(target)
    const app = createApp({})
    app.use(VueLiteLayer, { banner: false })

    const instance = app.config.globalProperties.$layer.open({
      title: 'HTMLElement Teleport',
      textContent: 'local content',
      teleport: target
    })
    await new Promise<void>((resolve) => queueMicrotask(resolve))

    expect(target.querySelector('[role="dialog"]')).not.toBeNull()
    expect(instance?.teleportKey).toMatch(/^element:/)
    expect(layerManager.getZIndex(instance!.id, instance!.teleportKey)).toBeGreaterThan(1000)

    app.config.globalProperties.$layer.close(instance)
    vi.advanceTimersByTime(250)
    await new Promise<void>((resolve) => queueMicrotask(resolve))

    expect(target.querySelector('[role="dialog"]')).toBeNull()
    expect(layerManager.getZIndex(instance!.id, instance!.teleportKey)).toBe(1000)
    vi.useRealTimers()
  })
})
