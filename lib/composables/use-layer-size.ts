import { reactive } from 'vue'
import { type Position, PositionPreset, type PixelSize } from '../types/layer'

/** 窗口样式（供模板绑定，避免 Vue 重渲染覆盖 maximize/restore 的 direct style） */
export interface WindowStyle {
  top: string
  left: string
  width: string
  height: string
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
  /** 弹层窗口的初始默认坐标 / Initial default coordinates of layer window */
  const defaultPosition: Position = { top: '', left: '' }
  /** 弹层窗口的当前坐标（拖拽后更新） / Current coordinates of layer window (updated after drag) */
  const currentPosition: Position = { top: '', left: '' }

  /** 供模板绑定的响应式窗口样式，避免 Vue :style 覆盖 direct DOM 修改 */
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
   * Constrain window within container boundaries
   *
   * @param windowEl - 弹层窗口元素 / Layer window element
   * @param containerEl - 约束容器元素 / Constraint container element
   */
  const clampToContainer = (windowEl: HTMLElement, containerEl: HTMLElement) => {
    const top = Math.max(
      0,
      Math.min(windowEl.offsetTop, containerEl.offsetHeight - windowEl.offsetHeight)
    )
    const left = Math.max(
      0,
      Math.min(windowEl.offsetLeft, containerEl.offsetWidth - windowEl.offsetWidth)
    )
    windowEl.style.top = top + 'px'
    windowEl.style.left = left + 'px'
  }

  /**
   * 临时启用位置/尺寸过渡动画，动画结束后自动移除
   * Temporarily enable position/size transition animation, automatically remove after animation ends
   *
   * 使用 setTimeout 兜底：若 transitionend 因元素移除等原因未触发，
   * 仍能可靠地清除 transition 样式，防止后续操作被干扰。
   * Uses setTimeout as fallback: if transitionend doesn't fire due to element removal etc.,
   * transition style is still reliably cleared to prevent interference with subsequent operations.
   */
  const transitionDuration = 200
  const transitionValue = `top ${transitionDuration}ms ease, left ${transitionDuration}ms ease, width ${transitionDuration}ms ease, height ${transitionDuration}ms ease`

  const withTransition = (el: HTMLElement, callback: () => void, onComplete?: () => void) => {
    el.style.transition = transitionValue
    callback()
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      el.style.transition = ''
      el.removeEventListener('transitionend', cleanup)
      onComplete?.()
    }
    el.addEventListener('transitionend', cleanup)
    setTimeout(cleanup, transitionDuration + 50)
  }

  /**
   * 最大化：将窗口铺满容器（带动画）
   * Maximize: Fill container with window (with animation)
   */
  const maximize = (windowEl: HTMLElement | undefined, onComplete?: () => void) => {
    if (!windowEl) return
    Object.assign(windowStyle, {
      top: '0px',
      left: '0px',
      width: maximumSize.width + 'px',
      height: maximumSize.height + 'px'
    })
    withTransition(
      windowEl,
      () => {
        windowEl.style.top = '0px'
        windowEl.style.left = '0px'
        windowEl.style.width = maximumSize.width + 'px'
        windowEl.style.height = maximumSize.height + 'px'
      },
      onComplete
    )
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
    windowEl: HTMLElement | undefined,
    containerEl: HTMLElement | undefined,
    onComplete?: () => void
  ) => {
    if (!windowEl || !containerEl) return

    const restoreTop = parseFloat(currentPosition.top) || 0
    const restoreLeft = parseFloat(currentPosition.left) || 0
    const containerH = containerEl.offsetHeight || containerEl.clientHeight
    const containerW = containerEl.offsetWidth || containerEl.clientWidth
    const clampedTop = Math.max(0, Math.min(restoreTop, containerH - defaultSize.height))
    const clampedLeft = Math.max(0, Math.min(restoreLeft, containerW - defaultSize.width))

    Object.assign(windowStyle, {
      top: clampedTop + 'px',
      left: clampedLeft + 'px',
      width: defaultSize.width + 'px',
      height: defaultSize.height + 'px'
    })
    withTransition(
      windowEl,
      () => {
        windowEl.style.top = clampedTop + 'px'
        windowEl.style.left = clampedLeft + 'px'
        windowEl.style.width = defaultSize.width + 'px'
        windowEl.style.height = defaultSize.height + 'px'
      },
      onComplete
    )
  }

  /**
   * 预设定位 → [行方向计算, 列方向计算] 的查找表
   * Preset positioning → lookup table for [row calculation, column calculation]
   */
  type PosFn = (gap: number, center: number, far: number) => number
  const posGap: PosFn = (gap) => gap
  const posCenter: PosFn = (_gap, center) => center
  const posFar: PosFn = (_gap, _center, far) => far

  const positionPresetMap: Record<PositionPreset, [PosFn, PosFn]> = {
    [PositionPreset.LEFT_TOP]: [posGap, posGap],
    [PositionPreset.LEFT_CENTER]: [posCenter, posGap],
    [PositionPreset.LEFT_BOTTOM]: [posFar, posGap],
    [PositionPreset.CENTER_TOP]: [posGap, posCenter],
    [PositionPreset.CENTER_CENTER]: [posCenter, posCenter],
    [PositionPreset.CENTER_BOTTOM]: [posFar, posCenter],
    [PositionPreset.RIGHT_TOP]: [posGap, posFar],
    [PositionPreset.RIGHT_CENTER]: [posCenter, posFar],
    [PositionPreset.RIGHT_BOTTOM]: [posFar, posFar]
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
    containerEl: HTMLElement | undefined,
    windowEl: HTMLElement | undefined
  ) => {
    if (!windowEl || !containerEl) return

    if (isCustomPosition(location)) {
      windowEl.style.top = location.top
      windowEl.style.left = location.left
      clampToContainer(windowEl, containerEl)
      // 保存自定义坐标到 defaultPosition / currentPosition，供还原时使用
      // Save custom coordinates to defaultPosition / currentPosition for restore
      defaultPosition.top = windowEl.style.top
      defaultPosition.left = windowEl.style.left
      currentPosition.top = windowEl.style.top
      currentPosition.left = windowEl.style.left
      Object.assign(windowStyle, {
        top: windowEl.style.top,
        left: windowEl.style.left,
        width: windowEl.offsetWidth + 'px',
        height: windowEl.offsetHeight + 'px'
      })
    } else {
      const gap = 25
      const rowCenter = containerEl.offsetHeight / 2 - defaultSize.height / 2
      const rowBottom = containerEl.offsetHeight - defaultSize.height - gap
      const colCenter = containerEl.offsetWidth / 2 - defaultSize.width / 2
      const colRight = containerEl.offsetWidth - defaultSize.width - gap

      const [rowFn, colFn] = positionPresetMap[location]
      windowEl.style.top = rowFn(gap, rowCenter, rowBottom) + 'px'
      windowEl.style.left = colFn(gap, colCenter, colRight) + 'px'

      defaultPosition.top = windowEl.style.top
      defaultPosition.left = windowEl.style.left
      currentPosition.top = windowEl.style.top
      currentPosition.left = windowEl.style.left
      Object.assign(windowStyle, { top: windowEl.style.top, left: windowEl.style.left })
    }
    windowStyle.width = windowEl.offsetWidth + 'px'
    windowStyle.height = windowEl.offsetHeight + 'px'
  }

  /**
   * 记录窗口的默认尺寸（用于还原时恢复）
   * Record window default size (for restoration)
   */
  const setDefaultSize = (windowEl: HTMLElement | undefined) => {
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
  const setMaximumSize = (containerEl: HTMLElement | Element | undefined) => {
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
  const setCurrentPosition = (windowEl: HTMLElement | undefined) => {
    if (!windowEl) return
    const newTop = windowEl.offsetTop + 'px'
    const newLeft = windowEl.offsetLeft + 'px'
    Object.assign(currentPosition, {
      top: newTop,
      left: newLeft
    })
    // 同步更新 windowStyle，确保 Vue 重渲染时不会覆盖拖拽后的位置
    // Sync windowStyle to ensure Vue re-render doesn't overwrite dragged position
    Object.assign(windowStyle, {
      top: newTop,
      left: newLeft
    })
  }

  return {
    windowStyle,
    maximize,
    restore,
    setDefaultSize,
    setMaximumSize,
    initPosition,
    setCurrentPosition
  }
}
