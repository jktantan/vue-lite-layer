import { reactive } from 'vue'
import { type Position, PositionPreset, type PixelSize, type WindowSize } from '../types/layer'
import { clampPosition, getPresetPosition, type NumericPosition } from '@lib/core/layer-geometry'

/** 窗口样式（供模板绑定，避免 Vue 重渲染覆盖 maximize/restore 的 direct style） / Window style (for template binding, prevents Vue re-render from overwriting maximize/restore direct styles) */
export interface WindowStyle {
  top: string
  left: string
  width: string
  height: string
}

export type WindowStylePatch = Partial<WindowStyle>

/**
 * Controls how an updated size/location is applied.
 *
 * - Normal layer: write the window and keep `windowStyle` in sync.
 * - Maximized layer: only update the stored default size/position so the next
 *   restore lands on the new values; the maximized layout must not change.
 * - Minimized layer: update the stored restore target; the hidden window is not
 *   written directly.
 */
export interface WindowLayoutApplyOptions {
  applyToWindow: boolean
  storeStyle: boolean
  maxWidth?: string
  maxHeight?: string
}

/**
 * 容器可用于放置窗口的尺寸
 * Size of the container available for placing windows
 *
 * 使用 clientWidth/clientHeight 而非 offsetWidth/offsetHeight：
 * 前者不含滚动条与边框，才是窗口真正能落地的区域。
 * 出现滚动条时若按 offset 计算，窗口会被允许压到滚动条下方。
 * Uses clientWidth/clientHeight instead of offsetWidth/offsetHeight: the
 * former excludes scrollbars and borders, which is the area a window can
 * actually occupy. Measuring with offset* lets a window slide under the
 * scrollbar when one is present.
 */
const getContainerSize = (el: HTMLElement): PixelSize => ({
  height: el.clientHeight || el.offsetHeight,
  width: el.clientWidth || el.offsetWidth
})

const applyWindowStyle = (
  windowStyle: WindowStyle,
  windowEl: HTMLElement | undefined | null,
  nextStyle: WindowStylePatch
): void => {
  Object.assign(windowStyle, nextStyle)
  if (!windowEl) return

  if (nextStyle.top != null) windowEl.style.top = nextStyle.top
  if (nextStyle.left != null) windowEl.style.left = nextStyle.left
  if (nextStyle.width != null) windowEl.style.width = nextStyle.width
  if (nextStyle.height != null) windowEl.style.height = nextStyle.height
}

/**
 * 临时启用位置/尺寸过渡动画，动画结束后自动移除
 * Temporarily enable position/size transition animation, automatically remove after animation ends
 *
 * 使用 setTimeout 兜底：若 transitionend 因元素移除等原因未触发，
 * 仍能可靠地清除 transition 样式，防止后续操作被干扰。
 * Uses setTimeout as fallback: if transitionend doesn't fire due to element removal etc.,
 * transition style is still reliably cleared to prevent interference with subsequent operations.
 *
 * 模块顶层导出：供 minimize/restore 过渡等需要同样节奏的代码复用。
 * Module-top exports so the minimize/restore transition (and any other consumer
 * that wants the same rhythm) can reuse the same duration/value.
 */
export const transitionDuration = 200
export const transitionValue = `top ${transitionDuration}ms ease, left ${transitionDuration}ms ease, width ${transitionDuration}ms ease, height ${transitionDuration}ms ease`
/**
 * Run a callback inside a 200ms top/left/width/height transition and clean up
 * once the transition ends (or after a `setTimeout` fallback). Returns the cleanup
 * function so the caller (typically `useLayerSize().dispose`) can cancel any
 * pending listener/timer if the owning layer unmounts mid-flight.
 */
export const withTransition = (
  el: HTMLElement,
  callback: () => void,
  onComplete?: () => void
): (() => void) => {
  el.style.transition = transitionValue
  callback()
  let cleaned = false
  let timeout: ReturnType<typeof setTimeout> | null = null
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    el.style.transition = ''
    el.removeEventListener('transitionend', onTransitionEnd)
    if (timeout) clearTimeout(timeout)
    onComplete?.()
  }
  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.target === el) cleanup()
  }
  el.addEventListener('transitionend', onTransitionEnd)
  timeout = setTimeout(cleanup, transitionDuration + 50)
  return cleanup
}

/**
 * 弹层尺寸与定位 Composable
 * Layer Size and Positioning Composable
 *
 * 管理弹层窗口的默认尺寸、最大化尺寸、初始定位、
 * 以及最大化/还原等操作。
 * Manages layer window default size, maximum size, initial positioning,
 * and operations like maximize/restore.
 */
export default (initialSize?: { width?: string; height?: string }) => {
  /** 弹层窗口的初始默认尺寸 / Initial default size of layer window */
  const defaultSize: PixelSize = { height: 0, width: 0 }
  /** 容器（最大化时）的可用尺寸 / Available size of container (when maximized) */
  const maximumSize: PixelSize = { height: 0, width: 0 }
  /** 弹层窗口的当前坐标（拖拽后更新） / Current coordinates of layer window (updated after drag) */
  const currentPosition: Position = { top: '', left: '' }

  /** 供模板绑定的响应式窗口样式，避免 Vue :style 覆盖 direct DOM 修改 / Reactive window style for template binding, prevents Vue :style from overwriting direct DOM modifications */
  const windowStyle = reactive<WindowStyle>({
    top: '',
    left: '',
    width: initialSize?.width ?? '',
    height: initialSize?.height ?? ''
  })

  /**
   * 判断传入的定位参数是否为自定义坐标对象
   * Determine if the passed positioning parameter is a custom coordinate object
   */
  const isCustomPosition = (item: Position | PositionPreset): item is Position => {
    return (item as Position).top != null && (item as Position).left != null
  }

  /**
   * 将窗口限制在容器边界内
   * Constrain window within container edges
   *
   * @param windowEl - 弹层窗口元素 / Layer window element
   * @param containerEl - 约束容器元素 / Constraint container element
   */
  const clampToContainer = (windowEl: HTMLElement, containerEl: HTMLElement) => {
    const containerSize = getContainerSize(containerEl)
    const { top, left } = clampPosition(
      { top: windowEl.offsetTop, left: windowEl.offsetLeft },
      { height: windowEl.offsetHeight, width: windowEl.offsetWidth },
      containerSize
    )
    windowEl.style.top = top + 'px'
    windowEl.style.left = left + 'px'
  }

  /** Pending `withTransition` cleanups, drained by `dispose()` when the layer unmounts. */
  const transitionCleanups = new Set<() => void>()
  const trackCleanup = (cleanup: (() => void) | undefined) => {
    if (!cleanup) return
    transitionCleanups.add(cleanup)
  }

  /**
   * 最大化：将窗口铺满容器
   * Maximize: Fill container with window
   */
  const maximize = (
    windowEl: HTMLElement | undefined | null,
    onComplete?: () => void,
    opts?: { animated?: boolean }
  ) => {
    if (!windowEl) return
    const animated = opts?.animated ?? true
    const applySize = () => {
      applyWindowStyle(windowStyle, windowEl, {
        top: '0px',
        left: '0px',
        width: maximumSize.width + 'px',
        height: maximumSize.height + 'px'
      })
    }

    if (animated) {
      trackCleanup(withTransition(windowEl, applySize, onComplete))
    } else {
      applySize()
      onComplete?.()
    }
  }

  /**
   * 还原：恢复到之前的尺寸和位置（带动画）
   * Restore: Restore to previous size and position (with animation)
   *
   * 注意：不能在 withTransition 之后立即调用 clampToContainer，
   * 因为此时 DOM 仍处于最大化布局（top:0, left:0），读取 offset 会得到错误值。
   * 改为使用已存储的 currentPosition / defaultSize 预先计算合法坐标。
   * Note: Cannot call clampToContainer immediately after withTransition,
   * because DOM is still in maximized layout (top:0, left:0), offset reads would be wrong.
   * Instead, pre-calculate valid coordinates from stored currentPosition / defaultSize.
   */
  const restore = (
    windowEl: HTMLElement | undefined | null,
    containerEl: HTMLElement | undefined | null,
    onComplete?: () => void
  ) => {
    if (!windowEl || !containerEl) return

    // `currentPosition` may be empty (initial state) or contain stale CSS
    // strings; `parseFloat('')` is NaN and would propagate as "NaNpx", which
    // browsers discard, snapping the window to (0,0). Treat NaN / non-finite
    // values as 0 so clampPosition always receives finite numbers.
    const restoreTop = Number.isFinite(parseFloat(currentPosition.top))
      ? parseFloat(currentPosition.top)
      : 0
    const restoreLeft = Number.isFinite(parseFloat(currentPosition.left))
      ? parseFloat(currentPosition.left)
      : 0
    const { top: clampedTop, left: clampedLeft } = clampPosition(
      { top: restoreTop, left: restoreLeft },
      defaultSize,
      getContainerSize(containerEl)
    )

    trackCleanup(
      withTransition(
        windowEl,
        () => {
          applyWindowStyle(windowStyle, windowEl, {
            top: clampedTop + 'px',
            left: clampedLeft + 'px',
            width: defaultSize.width + 'px',
            height: defaultSize.height + 'px'
          })
        },
        onComplete
      )
    )
  }

  /**
   * 初始化弹层窗口位置
   * Initialize layer window position
   *
   * @param location - 预设定位方式或自定义坐标 / Preset positioning method or custom coordinates
   * @param containerEl - 容器元素 / Container element
   * @param windowEl - 弹层窗口元素 / Layer window element
   */
  const initPosition = (
    location: Position | PositionPreset,
    containerEl: HTMLElement | undefined | null,
    windowEl: HTMLElement | undefined | null
  ) => {
    if (!windowEl || !containerEl) return

    if (isCustomPosition(location)) {
      windowEl.style.top = location.top
      windowEl.style.left = location.left
    } else {
      const { top, left } = getPresetPosition(location, defaultSize, getContainerSize(containerEl))
      windowEl.style.top = top + 'px'
      windowEl.style.left = left + 'px'
    }

    // Both branches clamp against the live DOM: presets can also compute
    // negative coordinates (e.g. center when the window is larger than the
    // container), and the custom branch is not guaranteed to be in-bounds.
    // 两个分支都基于实际 DOM 做 clamp：预设同样可能算出负坐标（例如窗口
    // 大于容器时的居中），自定义坐标也不保证在边界内。
    clampToContainer(windowEl, containerEl)
    currentPosition.top = windowEl.style.top
    currentPosition.left = windowEl.style.left
    applyWindowStyle(windowStyle, windowEl, {
      top: windowEl.style.top,
      left: windowEl.style.left,
      width: windowEl.offsetWidth + 'px',
      height: windowEl.offsetHeight + 'px'
    })
  }

  /**
   * 记录窗口的默认尺寸（用于还原时恢复）
   * Record window default size (for restoration)
   */
  const setDefaultSize = (windowEl: HTMLElement | undefined | null) => {
    if (!windowEl) return
    Object.assign(defaultSize, {
      height: windowEl.offsetHeight,
      width: windowEl.offsetWidth
    })
  }

  /**
   * 记录容器的可用尺寸（用于最大化时填充）
   * Record container available size (for filling when maximizing)
   */
  const setMaximumSize = (containerEl: HTMLElement | Element | undefined | null) => {
    if (!containerEl) return
    Object.assign(maximumSize, {
      height: containerEl.clientHeight,
      width: containerEl.clientWidth
    })
  }

  /**
   * 更新窗口当前位置（拖拽结束后调用）
   * Update window current position (called after drag ends)
   */
  const setCurrentPosition = (windowEl: HTMLElement | undefined | null) => {
    if (!windowEl) return
    const newTop = windowEl.offsetTop + 'px'
    const newLeft = windowEl.offsetLeft + 'px'
    Object.assign(currentPosition, {
      top: newTop,
      left: newLeft
    })
    // 同步更新 windowStyle，确保 Vue 重渲染时不会覆盖拖拽后的位置
    // Sync windowStyle to ensure Vue re-render doesn't overwrite dragged position
    applyWindowStyle(windowStyle, windowEl, {
      top: newTop,
      left: newLeft
    })
  }

  /** Clear pending transition timers/listeners when the owning layer unmounts. */
  const dispose = (): void => {
    for (const cleanup of transitionCleanups) cleanup()
    transitionCleanups.clear()
  }

  /**
   * Measures a CSS width/height pair without touching the real window.
   * A hidden probe inherits the container's containing block, so `%`, `rem`,
   * `vw` and `calc()` values resolve exactly like the window would.
   */
  const measureWindowSize = (
    size: WindowStylePatch,
    containerEl: HTMLElement,
    maxWidth?: string,
    maxHeight?: string
  ): PixelSize => {
    if (typeof document === 'undefined') return { height: 0, width: 0 }

    const probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    probe.style.pointerEvents = 'none'
    probe.style.boxSizing = 'border-box'
    probe.style.top = '0'
    probe.style.left = '0'
    if (size.width) probe.style.width = size.width
    if (size.height) probe.style.height = size.height
    if (maxWidth && maxWidth !== 'none') probe.style.maxWidth = maxWidth
    if (maxHeight && maxHeight !== 'none') probe.style.maxHeight = maxHeight

    containerEl.appendChild(probe)
    const measured = { height: probe.offsetHeight, width: probe.offsetWidth }
    probe.remove()
    return measured
  }

  /** Resolves custom CSS top/left values against the container. */
  const measurePosition = (position: Position, containerEl: HTMLElement): NumericPosition => {
    if (typeof document === 'undefined') return { top: 0, left: 0 }

    const probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    probe.style.pointerEvents = 'none'
    probe.style.width = '0'
    probe.style.height = '0'
    probe.style.top = position.top
    probe.style.left = position.left

    containerEl.appendChild(probe)
    const measured = { top: probe.offsetTop, left: probe.offsetLeft }
    probe.remove()
    return measured
  }

  /**
   * Applies a new `size` after the layer has been opened.
   *
   * `defaultSize` is updated from a probe even while maximized/minimized, so a
   * later restore uses the new size. `storeStyle` controls whether the reactive
   * `windowStyle` (also used as the minimize/restore target) is updated.
   */
  const applySize = (
    size: WindowSize | undefined,
    windowEl: HTMLElement | undefined | null,
    containerEl: HTMLElement | undefined | null,
    options: WindowLayoutApplyOptions
  ): void => {
    if (!size || (size.width == null && size.height == null)) return

    const fallbackWidth = defaultSize.width > 0 ? `${defaultSize.width}px` : windowStyle.width
    const fallbackHeight = defaultSize.height > 0 ? `${defaultSize.height}px` : windowStyle.height
    const nextSize: WindowStylePatch = {
      width: size.width ?? fallbackWidth,
      height: size.height ?? fallbackHeight
    }
    if (!nextSize.width && !nextSize.height) return

    if (containerEl) {
      const measured = measureWindowSize(nextSize, containerEl, options.maxWidth, options.maxHeight)
      if (measured.width > 0) defaultSize.width = measured.width
      if (measured.height > 0) defaultSize.height = measured.height
    }

    if (options.storeStyle) Object.assign(windowStyle, nextSize)
    if (!options.applyToWindow || !windowEl) return

    applyWindowStyle(windowStyle, windowEl, nextSize)
    if (containerEl) {
      clampToContainer(windowEl, containerEl)
      setCurrentPosition(windowEl)
    }
  }

  /** Applies a new `location` after the layer has been opened. */
  const applyPosition = (
    location: Position | PositionPreset | undefined,
    windowEl: HTMLElement | undefined | null,
    containerEl: HTMLElement | undefined | null,
    options: Pick<WindowLayoutApplyOptions, 'applyToWindow' | 'storeStyle'>
  ): void => {
    if (!location || !containerEl) return

    const containerSize = getContainerSize(containerEl)
    const target = isCustomPosition(location)
      ? measurePosition(location, containerEl)
      : (getPresetPosition(location, defaultSize, containerSize) ??
        getPresetPosition(PositionPreset.CENTER_CENTER, defaultSize, containerSize))
    const { top, left } = clampPosition(target, defaultSize, containerSize)

    currentPosition.top = `${top}px`
    currentPosition.left = `${left}px`
    if (options.storeStyle) Object.assign(windowStyle, currentPosition)
    if (!options.applyToWindow || !windowEl) return
    applyWindowStyle(windowStyle, windowEl, currentPosition)
  }

  return {
    windowStyle,
    maximize,
    restore,
    setDefaultSize,
    setMaximumSize,
    initPosition,
    setCurrentPosition,
    applySize,
    applyPosition,
    dispose
  }
}
