import mitt from 'mitt'
import { createApp } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import LiteLayer from '@lib/LiteLayer.vue'
import VueLiteLayer from '@lib/index'
import layerManager from '@lib/core/layer-manager'
import { createLayerEmitterPlugin } from '@lib/core/layer-emitter'
import type { LayerEvents } from '@lib/core/layer-events'
import { resetScrollLockForTest } from '@lib/core/scroll-lock'
import dockMetrics from '@lib/assets/style/metrics.module.scss'

const DOCK_WIDTH = parseFloat(dockMetrics.dockItemWidth)
const DOCK_HEIGHT = parseFloat(dockMetrics.dockItemHeight)
const DOCK_GAP = parseFloat(dockMetrics.dockItemGap)
const DOCK_INSET = parseFloat(dockMetrics.dockInset)

/**
 * 固定 documentElement.clientWidth（jsdom 默认为 0），返回恢复函数。
 * Pin documentElement.clientWidth (jsdom reports 0), returns a restore fn.
 */
const mockViewportWidth = (width: number) => {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    get: () => width
  })
  return () => {
    delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth
  }
}

const mountMinimizableLayer = async (id: string, title: string) => {
  const emitter = mitt<LayerEvents>()
  const wrapper = mount(LiteLayer, {
    attachTo: document.body,
    props: {
      id,
      title,
      teleport: 'body',
      content: 'content',
      min: true
    },
    global: {
      plugins: [createLayerEmitterPlugin(emitter)]
    }
  })
  await wrapper.vm.$nextTick()

  return { wrapper, emitter }
}

const minimizedDockItems = () =>
  [...document.body.querySelectorAll<HTMLElement>('.lite-layer__dock-item')]

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

  test('keeps the layer open when beforeClose rejects a close request', async () => {
    const emitter = mitt<LayerEvents>()
    const wrapper = mount(LiteLayer, {
      attachTo: document.body,
      props: {
        id: 'guarded-layer',
        title: 'Guarded Layer',
        teleport: 'body',
        content: 'content',
        beforeClose: () => false
      },
      global: {
        plugins: [createLayerEmitterPlugin(emitter)]
      }
    })

    emitter.emit('requestClose', { reason: 'programmatic' })
    await Promise.resolve()

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    wrapper.unmount()
  })

  test('footer buttons are non-submit buttons', async () => {
    const { wrapper } = mountLayer()
    await wrapper.vm.$nextTick()

    const buttons = [...document.body.querySelectorAll('button.lite-layer__button')]

    expect(buttons).toHaveLength(2)
    expect(buttons.every((button) => button.getAttribute('type') === 'button')).toBe(true)
  })

  test('minimizes to a dock item and restores the window', async () => {
    const emitter = mitt<LayerEvents>()
    const wrapper = mount(LiteLayer, {
      attachTo: document.body,
      props: {
        id: 'minimizable-layer',
        title: 'Minimizable layer',
        teleport: 'body',
        content: 'content',
        min: true
      },
      global: {
        plugins: [createLayerEmitterPlugin(emitter)]
      }
    })
    await wrapper.vm.$nextTick()

    emitter.emit('minimize')
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.lite-layer__shade')).toBeNull()
    expect(document.body.querySelector('.lite-layer__window')?.classList.contains('lite-layer__window--minimized')).toBe(true)
    const dockItem = document.body.querySelector<HTMLElement>('.lite-layer__dock-item')
    expect(dockItem?.textContent).toContain('Minimizable layer')
    expect(dockItem?.style.left).toBe('12px')
    const restoreButton = dockItem?.querySelector<HTMLButtonElement>('.lite-layer__icon-restore')
    expect(restoreButton?.getAttribute('aria-label')).toBe('VueLiteLayer.restore')
    expect(dockItem?.querySelector('.lite-layer__icon-close')).not.toBeNull()

    restoreButton?.click()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.lite-layer__dock-item')).toBeNull()
    expect(document.body.querySelector('.lite-layer__window')?.classList.contains('lite-layer__window--minimized')).toBe(false)
  })

  test('restores a maximized layer from the dock as maximized', async () => {
    const emitter = mitt<LayerEvents>()
    const wrapper = mount(LiteLayer, {
      attachTo: document.body,
      props: {
        id: 'maximized-minimizable-layer',
        title: 'Maximized minimizable layer',
        teleport: 'body',
        content: 'content',
        min: true
      },
      global: {
        plugins: [createLayerEmitterPlugin(emitter)]
      }
    })
    await wrapper.vm.$nextTick()

    emitter.emit('maximum')
    emitter.emit('minimize')
    await wrapper.vm.$nextTick()
    document.body.querySelector<HTMLButtonElement>('.lite-layer__dock-item .lite-layer__icon-restore')?.click()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.lite-layer__window-header .lite-layer__icon-restore')).not.toBeNull()
    expect(document.body.querySelector('.lite-layer__window-header .lite-layer__icon-maximum')).toBeNull()
  })

  test('lays minimized dock items in one row using the stylesheet geometry', async () => {
    const restoreViewport = mockViewportWidth(DOCK_INSET + (DOCK_WIDTH + DOCK_GAP) * 3)

    try {
      const first = await mountMinimizableLayer('dock-row-a', 'Dock A')
      const second = await mountMinimizableLayer('dock-row-b', 'Dock B')

      first.emitter.emit('minimize')
      second.emitter.emit('minimize')
      await first.wrapper.vm.$nextTick()
      await second.wrapper.vm.$nextTick()

      const items = minimizedDockItems()

      expect(items).toHaveLength(2)
      // 停靠几何来自 style.scss（经 metrics.module.scss 导出），脚本不再硬编码
      // Dock geometry comes from style.scss (via the metrics.module.scss export)
      expect(items[0].style.left).toBe(`${DOCK_INSET}px`)
      expect(items[0].style.bottom).toBe(`${DOCK_INSET}px`)
      expect(items[1].style.left).toBe(`${DOCK_INSET + DOCK_WIDTH + DOCK_GAP}px`)
      expect(items[1].style.bottom).toBe(`${DOCK_INSET}px`)
    } finally {
      restoreViewport()
      layerManager.resetForTest()
    }
  })

  test('wraps minimized dock items instead of letting them overflow the container', async () => {
    // 容器宽度只够放一个停靠项 / Container fits exactly one dock item
    const viewportWidth = DOCK_INSET + DOCK_WIDTH
    const restoreViewport = mockViewportWidth(viewportWidth)

    try {
      const first = await mountMinimizableLayer('dock-wrap-a', 'Wrap A')
      const second = await mountMinimizableLayer('dock-wrap-b', 'Wrap B')

      first.emitter.emit('minimize')
      second.emitter.emit('minimize')
      await first.wrapper.vm.$nextTick()
      await second.wrapper.vm.$nextTick()

      const items = minimizedDockItems()

      expect(items).toHaveLength(2)
      // 第二项换到上一行，而不是继续右移到可视范围之外
      // The second item wraps onto the row above instead of spilling right
      expect(items[1].style.left).toBe(`${DOCK_INSET}px`)
      expect(items[1].style.bottom).toBe(`${DOCK_INSET + DOCK_HEIGHT + DOCK_GAP}px`)

      for (const item of items) {
        expect(parseFloat(item.style.left) + DOCK_WIDTH).toBeLessThanOrEqual(viewportWidth)
      }
    } finally {
      restoreViewport()
      layerManager.resetForTest()
    }
  })

  test('locks body scroll while maximized and releases it after restore', async () => {
    const emitter = mitt<LayerEvents>()
    const wrapper = mount(LiteLayer, {
      attachTo: document.body,
      props: {
        id: 'maximize-scroll-layer',
        title: 'Maximize scroll layer',
        teleport: 'body',
        content: 'content',
        // 无遮罩弹层本身不锁滚动，只有最大化才应锁
        // An unshaded layer does not lock scrolling by itself; only maximizing should
        shade: false
      },
      global: {
        plugins: [createLayerEmitterPlugin(emitter)]
      }
    })
    await wrapper.vm.$nextTick()

    try {
      expect(document.body.style.overflow).toBe('')

      emitter.emit('maximum')
      await wrapper.vm.$nextTick()

      // 最大化占满可视区，根滚动条必须隐藏 / Maximizing fills the viewport, so the root scrollbar must be hidden
      expect(document.body.style.overflow).toBe('hidden')

      emitter.emit('restore')
      await wrapper.vm.$nextTick()

      expect(document.body.style.overflow).toBe('')
    } finally {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      resetScrollLockForTest()
    }
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
