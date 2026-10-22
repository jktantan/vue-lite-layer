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
import { PositionPreset } from '@lib/types/layer'
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

const mockViewportSize = (width: number, height: number) => {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    get: () => width
  })
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    get: () => height
  })
  return () => {
    delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth
    delete (document.documentElement as unknown as { clientHeight?: number }).clientHeight
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
    vi.useFakeTimers()
    try {
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
        await Promise.resolve()
        // 推进兜底定时器（覆盖 handleMinimize 225ms 与 withTransition 250ms 双重兜底）
        vi.advanceTimersByTime(280)
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
        await Promise.resolve()
        vi.advanceTimersByTime(280)
        await wrapper.vm.$nextTick()

        expect(document.body.querySelector('.lite-layer__dock-item')).toBeNull()
        expect(document.body.querySelector('.lite-layer__window')?.classList.contains('lite-layer__window--minimized')).toBe(false)
        wrapper.unmount()
    } finally {
      vi.useRealTimers()
      layerManager.resetForTest()
    }
  })

  test('restores a maximized layer from the dock as maximized', async () => {
    vi.useFakeTimers()
    try {
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
        await Promise.resolve()
        vi.advanceTimersByTime(280)
        await wrapper.vm.$nextTick()
        document.body.querySelector<HTMLButtonElement>('.lite-layer__dock-item .lite-layer__icon-restore')?.click()
        await Promise.resolve()
        vi.advanceTimersByTime(280)
        await wrapper.vm.$nextTick()

        expect(document.body.querySelector('.lite-layer__window-header .lite-layer__icon-restore')).not.toBeNull()
        expect(document.body.querySelector('.lite-layer__window-header .lite-layer__icon-maximum')).toBeNull()
        wrapper.unmount()
    } finally {
      vi.useRealTimers()
      layerManager.resetForTest()
    }
  })

  test('lays minimized dock items in one row using the stylesheet geometry', async () => {
    const restoreViewport = mockViewportWidth(DOCK_INSET + (DOCK_WIDTH + DOCK_GAP) * 3)
    vi.useFakeTimers()

    try {
      const first = await mountMinimizableLayer('dock-row-a', 'Dock A')
      const second = await mountMinimizableLayer('dock-row-b', 'Dock B')

      first.emitter.emit('minimize')
      second.emitter.emit('minimize')
      // 推进 handleMinimize 的 225ms 与 withTransition 的 250ms 双重兜底
      vi.advanceTimersByTime(280)
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
      vi.useRealTimers()
      restoreViewport()
      layerManager.resetForTest()
    }
  })

  test('wraps minimized dock items instead of letting them overflow the container', async () => {
    // 容器宽度只够放一个停靠项 / Container fits exactly one dock item
    const viewportWidth = DOCK_INSET + DOCK_WIDTH
    const restoreViewport = mockViewportWidth(viewportWidth)
    vi.useFakeTimers()

    try {
      const first = await mountMinimizableLayer('dock-wrap-a', 'Wrap A')
      const second = await mountMinimizableLayer('dock-wrap-b', 'Wrap B')

      first.emitter.emit('minimize')
      second.emitter.emit('minimize')
      vi.advanceTimersByTime(280)
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
      vi.useRealTimers()
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

  test('animates minimize: window style transitions to dock rect before --minimized is applied', async () => {
    vi.useFakeTimers()
    try {
      const { wrapper, emitter } = await mountMinimizableLayer('anim-min-layer', 'Anim Min')

      const windowEl = document.body.querySelector<HTMLElement>('.lite-layer__window')
      expect(windowEl).not.toBeNull()

      emitter.emit('minimize')
      // flush microtasks so handleMinimize's synchronous withTransition writes the transition style
      await Promise.resolve()
      // 立即断言：最小化尚未结束（--minimized 尚未应用），但过渡样式已写入
      expect(windowEl!.classList.contains('lite-layer__window--minimized')).toBe(false)
      expect(windowEl!.style.transition).toContain('top 200ms ease')

      // 推进兜底定时器（覆盖 handleMinimize 的 225ms 与 withTransition 的 250ms 双重兜底）
      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      expect(windowEl!.classList.contains('lite-layer__window--minimized')).toBe(true)
      expect(document.body.querySelector('.lite-layer__dock-item')).not.toBeNull()

      wrapper.unmount()
    } finally {
      vi.useRealTimers()
      layerManager.resetForTest()
    }
  })

  test('animates minimize from the maximized state: the dock target survives the re-render', async () => {
    // 回归：最大化后最小化曾经没有动画。`isMaximized` 被 LayerHeader 的 prop
    // 读取，如果 handleMinimize 一开头就翻它，LiteLayer 会重渲染，窗口的
    // `:style`（绑定 windowStyle = 最大化尺寸）被整体写回，正好盖掉
    // withTransition 刚写入的 dock 目标，窗口于是留在最大化尺寸、一动不动。
    // 修法是把 `isMaximized` 的翻转推迟到过渡结束。
    // Regression: minimizing from the maximized state used to animate
    // nothing. Flipping `isMaximized` up front re-rendered the layer and its
    // window `:style` (bound to the maximized windowStyle) overwrote the dock
    // target written by withTransition, freezing the window at the maximized
    // size. The flip is now deferred to the end of the transition.
    vi.useFakeTimers()
    try {
      const { wrapper, emitter } = await mountMinimizableLayer('max-anim-min-layer', 'Max Anim Min')

      emitter.emit('maximum')
      await wrapper.vm.$nextTick()
      const windowEl = document.body.querySelector<HTMLElement>('.lite-layer__window')!

      emitter.emit('minimize')
      // 关键断言：翻过 isMaximized 的那个 tick 之后，dock 目标仍在，没有被
      // windowStyle 覆盖回最大化尺寸。
      await wrapper.vm.$nextTick()
      expect(windowEl.style.transition).toContain('top 200ms ease')
      expect(windowEl.style.left).toBe(`${DOCK_INSET}px`)
      expect(windowEl.style.width).toBe(`${DOCK_WIDTH}px`)
      expect(windowEl.style.height).toBe(`${DOCK_HEIGHT}px`)

      // 过渡结束后：最大化标记已清、窗口已隐藏、dock 项出现。
      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      expect(windowEl.classList.contains('lite-layer__window--minimized')).toBe(true)
      expect(document.body.querySelector('.lite-layer__dock-item')).not.toBeNull()
      // isMaximized 已被清（header 重新显示最大化按钮），证明翻转确实延后了
      // 而不是没发生。
      expect(windowEl.querySelector('.lite-layer__icon-maximum')).not.toBeNull()

      // 恢复：因为最小化前是最大化，恢复后应回到最大化（既有行为），
      // header 显示 restore 按钮。
      document.body.querySelector<HTMLButtonElement>('.lite-layer__dock-item .lite-layer__icon-restore')?.click()
      await wrapper.vm.$nextTick()
      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      expect(windowEl.querySelector('.lite-layer__icon-restore')).not.toBeNull()
      expect(windowEl.querySelector('.lite-layer__icon-maximum')).toBeNull()

      wrapper.unmount()
    } finally {
      vi.useRealTimers()
      layerManager.resetForTest()
    }
  })

  test('restore: window flies back from the dock rect to its original rect', async () => {
    // 恢复必须与最小化对称：窗口从 dock 项的矩形出发，200ms 内位移+缩放
    // 回最小化前的原位/原尺寸。之前的实现是「dock 项淡出 + 窗口闪现」，
    // 完全没有位移动画——这正是用户报的「恢复动画错了」。
    // Restore must mirror minimize: the window starts at the dock rect and
    // flies (position + size) back to its pre-minimize rect. The previous
    // implementation just faded the dock out and popped the window in, with
    // no motion at all - the bug the user reported.
    vi.useFakeTimers()
    try {
      const { wrapper, emitter } = await mountMinimizableLayer('fly-restore-layer', 'Fly Restore')

      emitter.emit('minimize')
      await Promise.resolve()
      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      const windowEl = document.body.querySelector<HTMLElement>('.lite-layer__window')!
      expect(windowEl.classList.contains('lite-layer__window--minimized')).toBe(true)
      expect(document.body.querySelector('.lite-layer__dock-item')).not.toBeNull()

      // The pre-minimize rect (windowStyle survives under --minimized) is
      // where the fly must land.
      const originalRect = {
        top: windowEl.style.top,
        left: windowEl.style.left,
        width: windowEl.style.width,
        height: windowEl.style.height
      }
      // Sanity: the original width is not the dock width, so we can tell the
      // start rect from the end rect.
      expect(originalRect.width).not.toBe(`${DOCK_WIDTH}px`)

      // Click the dock restore button.
      document.body
        .querySelector<HTMLButtonElement>('.lite-layer__dock-item .lite-layer__icon-restore')
        ?.click()

      // The start rect is written synchronously (while the element is still
      // display:none and before Vue flushes the class change), so at this
      // instant the window is already pinned to the dock rect - the "from the
      // dock" start of the flight.
      expect(windowEl.style.left).toBe(`${DOCK_INSET}px`)
      expect(windowEl.style.width).toBe(`${DOCK_WIDTH}px`)
      expect(windowEl.style.height).toBe(`${DOCK_HEIGHT}px`)

      // After the flush the --minimized class is gone and the shared 200ms
      // transition is driving the window back to its original rect.
      await wrapper.vm.$nextTick()
      expect(windowEl.classList.contains('lite-layer__window--minimized')).toBe(false)
      expect(windowEl.style.transition).toContain('top 200ms ease')

      // Once the transition completes the window rests at its original rect
      // and the dock item is gone.
      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      expect(document.body.querySelector('.lite-layer__dock-item')).toBeNull()
      expect(windowEl.style.top).toBe(originalRect.top)
      expect(windowEl.style.left).toBe(originalRect.left)
      expect(windowEl.style.width).toBe(originalRect.width)
      expect(windowEl.style.height).toBe(originalRect.height)

      wrapper.unmount()
    } finally {
      vi.useRealTimers()
      layerManager.resetForTest()
    }
  })

  test('minimize animation targets the dragged dock position, not the bare dock layout', async () => {
    const restoreViewport = mockViewportSize(1024, 768)
    vi.useFakeTimers()
    try {
      const { wrapper, emitter } = await mountMinimizableLayer('drag-min-layer', 'Drag Min')

      // 1) Minimize first so the dock item mounts and becomes draggable.
      emitter.emit('minimize')
      await Promise.resolve()
      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      const dockItem = document.body.querySelector<HTMLElement>('.lite-layer__dock-item')
      expect(dockItem).not.toBeNull()
      // jsdom reports getBoundingClientRect as all zeros, which would clamp
      // the drag math to (0, 0). Stub it with realistic dock dimensions so
      // the handler can place the dock item at the requested offset.
      const fakeRect = { left: 0, top: 0, right: 220, bottom: 40, width: 220, height: 40, x: 0, y: 0, toJSON: () => fakeRect }
      dockItem!.getBoundingClientRect = () => fakeRect as DOMRect

      // 2) Drag the dock item to a custom position.
      const startClientX = 30
      const startClientY = 40
      dockItem!.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: startClientX, clientY: startClientY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: startClientX + 200, clientY: startClientY + 180 })
      )
      document.dispatchEvent(new MouseEvent('mouseup'))
      await wrapper.vm.$nextTick()
      // Sanity check: dock item is now pinned to the dragged position.
      expect(dockItem!.style.left).toBe('200px')
      expect(dockItem!.style.top).toBe('180px')

      // 3) Restore from the dock so the window comes back at its layout rect.
      dockItem!.querySelector<HTMLButtonElement>('.lite-layer__icon-restore')?.click()
      await Promise.resolve()
      await wrapper.vm.$nextTick()
      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      const windowEl = document.body.querySelector<HTMLElement>('.lite-layer__window')!
      expect(document.body.querySelector('.lite-layer__dock-item')).toBeNull()

      // 4) Minimize again. The fly target must match the *dragged* dock
      //    position, not the bare dockLayout geometry; otherwise the window
      //    slides to a stale rect and the dock item appears to "teleport".
      emitter.emit('minimize')
      await Promise.resolve()
      // withTransition writes the dock rect synchronously into inline style
      // before yielding; capture it before the transitionend fallback fires.
      expect(windowEl.style.transition).toContain('top 200ms ease')
      expect(windowEl.style.left).toBe('200px')
      expect(windowEl.style.top).toBe('180px')

      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
      restoreViewport()
      layerManager.resetForTest()
    }
  })

  test('restore animation starts from the dragged dock position, not the bare dock layout', async () => {
    // 用户拖动过 dock 项时，恢复的飞行起点必须跟到拖到的位置，否则窗口
    // 会从 dock 几何位置起飞、和 dock 项实际位置错开。
    // When the dock item was dragged, restore's flight must start from the
    // dragged position, otherwise it takes off from the bare dock geometry
    // and visually disconnects from where the dock item actually sits.
    const restoreViewport = mockViewportSize(1024, 768)
    vi.useFakeTimers()
    try {
      const { wrapper, emitter } = await mountMinimizableLayer('drag-restore-layer', 'Drag Restore')

      emitter.emit('minimize')
      await Promise.resolve()
      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      const dockItem = document.body.querySelector<HTMLElement>('.lite-layer__dock-item')!
      const fakeRect = { left: 0, top: 0, right: 220, bottom: 40, width: 220, height: 40, x: 0, y: 0, toJSON: () => fakeRect }
      dockItem.getBoundingClientRect = () => fakeRect as DOMRect
      // Drag the dock item to a custom position.
      const startClientX = 20
      const startClientY = 30
      dockItem.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: startClientX, clientY: startClientY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: startClientX + 250, clientY: startClientY + 160 })
      )
      document.dispatchEvent(new MouseEvent('mouseup'))
      await wrapper.vm.$nextTick()
      expect(dockItem.style.left).toBe('250px')
      expect(dockItem.style.top).toBe('160px')

      // Trigger restore. The window must re-enter pinned to the *dragged* dock
      // rect (written synchronously, while still display:none), so the flight
      // starts there and lands at the original rect.
      dockItem.querySelector<HTMLButtonElement>('.lite-layer__icon-restore')?.click()
      const windowEl = document.body.querySelector<HTMLElement>('.lite-layer__window')!
      expect(windowEl.style.left).toBe('250px')
      expect(windowEl.style.top).toBe('160px')
      await wrapper.vm.$nextTick()
      expect(windowEl.style.transition).toContain('top 200ms ease')

      vi.advanceTimersByTime(280)
      await wrapper.vm.$nextTick()
      expect(document.body.querySelector('.lite-layer__dock-item')).toBeNull()
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
      restoreViewport()
      layerManager.resetForTest()
    }
  })

  test('restores focus to the opener after closing', async () => {
    vi.useFakeTimers()
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    const emitter = mitt<LayerEvents>()
    const wrapper = mount(LiteLayer, {
      attachTo: document.body,
      props: {
        id: 'focus-restore-layer',
        title: 'Focus restore layer',
        teleport: 'body',
        content: 'content'
      },
      global: {
        plugins: [createLayerEmitterPlugin(emitter)]
      }
    })
    await wrapper.vm.$nextTick()
    emitter.on('unmount', () => wrapper.unmount())

    try {
      const closeButton = document.body.querySelector<HTMLButtonElement>('.lite-layer__icon-close')
      expect(closeButton).not.toBeNull()
      closeButton!.focus()

      emitter.emit('requestClose', { reason: 'header' })
      await Promise.resolve()
      vi.advanceTimersByTime(300)
      await wrapper.vm.$nextTick()

      // Restored in onBeforeUnmount, while the focused button is still in the DOM.
      expect(document.activeElement).toBe(opener)
    } finally {
      vi.useRealTimers()
    }
  })

  test('does not leak minimized dock state when unmounted mid-minimize', async () => {
    vi.useFakeTimers()
    layerManager.resetForTest()

    try {
      const { wrapper, emitter } = await mountMinimizableLayer(
        'unmount-during-minimize',
        'Unmount during minimize'
      )

      emitter.emit('minimize')
      await Promise.resolve()
      wrapper.unmount()
      // Both the withTransition fallback (250ms) and the minimize fallback
      // (225ms) would fire in this window; neither may re-register the layer.
      vi.advanceTimersByTime(400)

      expect(layerManager.getMinimizedGroups().size).toBe(0)
    } finally {
      vi.useRealTimers()
      layerManager.resetForTest()
    }
  })

  test('ignores programmatic maximize when max is false', async () => {
    vi.useFakeTimers()
    const emitter = mitt<LayerEvents>()
    const wrapper = mount(LiteLayer, {
      attachTo: document.body,
      props: {
        id: 'max-disabled-layer',
        title: 'Max disabled layer',
        teleport: 'body',
        content: 'content',
        max: false
      },
      global: {
        plugins: [createLayerEmitterPlugin(emitter)]
      }
    })
    await wrapper.vm.$nextTick()

    try {
      emitter.emit('maximum')
      await wrapper.vm.$nextTick()
      vi.advanceTimersByTime(300)
      await wrapper.vm.$nextTick()

      // The header would show the restore button if the window had maximized.
      expect(
        document.body.querySelector('.lite-layer__window-header .lite-layer__icon-restore')
      ).toBeNull()
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  test('applies updated size and location after open', async () => {
    const { wrapper } = mountLayer()
    await wrapper.vm.$nextTick()

    try {
      const layerEl = document.body.querySelector<HTMLElement>('.lite-layer')!
      Object.defineProperty(layerEl, 'clientWidth', { configurable: true, value: 800 })
      Object.defineProperty(layerEl, 'clientHeight', { configurable: true, value: 600 })
      const windowEl = document.body.querySelector<HTMLElement>('.lite-layer__window')!

      await wrapper.setProps({ size: { width: '500px', height: '250px' } })
      await wrapper.vm.$nextTick()

      expect(windowEl.style.width).toBe('500px')
      expect(windowEl.style.height).toBe('250px')

      await wrapper.setProps({ location: PositionPreset.LEFT_TOP })
      await wrapper.vm.$nextTick()

      expect(windowEl.style.top).toBe('25px')
      expect(windowEl.style.left).toBe('25px')
    } finally {
      wrapper.unmount()
    }
  })

  test('still unmounts when onClosed throws', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const emitter = mitt<LayerEvents>()
    const wrapper = mount(LiteLayer, {
      attachTo: document.body,
      props: {
        id: 'on-closed-throw-layer',
        title: 'onClosed throw layer',
        teleport: 'body',
        content: 'content',
        onClosed: () => {
          throw new Error('onClosed failed')
        }
      },
      global: {
        plugins: [createLayerEmitterPlugin(emitter)]
      }
    })
    await wrapper.vm.$nextTick()
    const unmount = vi.fn()
    emitter.on('unmount', unmount)

    try {
      emitter.emit('requestClose', { reason: 'programmatic' })
      await Promise.resolve()
      vi.advanceTimersByTime(300)

      expect(unmount).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  test('still closes when onClose throws', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const emitter = mitt<LayerEvents>()
    const wrapper = mount(LiteLayer, {
      attachTo: document.body,
      props: {
        id: 'on-close-throw-layer',
        title: 'onClose throw layer',
        teleport: 'body',
        content: 'content',
        onClose: () => {
          throw new Error('onClose failed')
        }
      },
      global: {
        plugins: [createLayerEmitterPlugin(emitter)]
      }
    })
    await wrapper.vm.$nextTick()
    const unmount = vi.fn()
    emitter.on('unmount', unmount)

    try {
      emitter.emit('requestClose', { reason: 'programmatic' })
      await Promise.resolve()
      vi.advanceTimersByTime(300)

      expect(unmount).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })
})
