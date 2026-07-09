/**
 * 拖拽功能 Composable
 * Draggable Composable
 *
 * 为弹层窗口提供拖拽能力，通过标题栏（拖拽手柄）拖动整个窗口。
 * Provides drag capability for layer windows, dragging entire window via title bar (drag handle).
 * 拖拽范围被限制在容器元素内部，最大化状态下禁止拖拽。
 * Drag range is constrained within container element, dragging is disabled when maximized.
 */
interface DragSizeHelper {
  setCurrentPosition: (windowEl: HTMLElement | undefined | null) => void
}

interface DragBounds {
  maxX: number
  maxY: number
  offsetX: number
  offsetY: number
}

const SNAP_MARGIN = 10

export default () => {
  /** 当前绑定了 mousedown 事件的拖拽手柄元素 / Currently bound drag handle element with mousedown event */
  let activeDragHandle: HTMLElement | null = null
  /** mousedown 事件处理器引用（用于解绑） / mousedown event handler reference (for unbinding) */
  let onMouseDown: ((e: MouseEvent) => void) | null = null
  /** 当前活跃的 document 事件清理函数（防止中途卸载泄漏） / Active document event cleanup function (prevents leak on mid-drag unmount) */
  let activeCleanup: (() => void) | null = null
  let animationFrame = 0
  let nextLeft = 0
  let nextTop = 0

  const clampDragPosition = (value: number, max: number): number => {
    const safeMax = Math.max(0, max)
    if (value < SNAP_MARGIN) return 0
    if (value > safeMax - SNAP_MARGIN) return safeMax
    return Math.max(0, value)
  }

  const writePosition = (windowEl: HTMLElement): void => {
    animationFrame = 0
    windowEl.style.left = `${nextLeft}px`
    windowEl.style.top = `${nextTop}px`
  }

  /**
   * 绑定拖拽行为
   * Bind drag behavior
   *
   * @param handleEl - 拖拽手柄元素（通常是标题栏） / Drag handle element (usually title bar)
   * @param windowEl - 被拖拽的窗口元素 / Window element being dragged
   * @param containerEl - 限制拖拽范围的容器元素 / Container element that constrains drag range
   * @param sizeHelper - 尺寸工具对象，用于同步拖拽后的坐标 / Size helper object for syncing coordinates after drag
   */
  const bindDrag = (
    handleEl: HTMLElement | undefined | null,
    windowEl: HTMLElement | undefined | null,
    containerEl: HTMLElement | undefined | null,
    sizeHelper: DragSizeHelper
  ) => {
    if (!handleEl || !windowEl || !containerEl) return

    onMouseDown = (e: MouseEvent) => {
      // 最大化状态下（窗口与容器同尺寸）不允许拖拽 / Dragging not allowed when maximized (window same size as container)
      if (
        windowEl.offsetWidth === containerEl.offsetWidth &&
        windowEl.offsetHeight === containerEl.offsetHeight
      ) {
        return
      }

      const bounds: DragBounds = {
        maxX: containerEl.offsetWidth - windowEl.offsetWidth,
        maxY: containerEl.offsetHeight - windowEl.offsetHeight,
        offsetX: e.clientX - windowEl.offsetLeft,
        offsetY: e.clientY - windowEl.offsetTop
      }

      const onMouseMove = (e: MouseEvent) => {
        e.preventDefault()
        nextLeft = clampDragPosition(e.clientX - bounds.offsetX, bounds.maxX)
        nextTop = clampDragPosition(e.clientY - bounds.offsetY, bounds.maxY)

        if (!animationFrame) {
          animationFrame = requestAnimationFrame(() => writePosition(windowEl))
        }
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        if (animationFrame) {
          cancelAnimationFrame(animationFrame)
          writePosition(windowEl)
        }
        activeCleanup = null
        // 仅在拖拽结束时同步坐标（而非每次 mousemove），减少 DOM 读取开销
        // Only sync coordinates on drag end (not every mousemove) to reduce DOM read overhead
        sizeHelper.setCurrentPosition(windowEl)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

      // 记录清理函数，防止组件在拖拽中途被销毁时泄漏
      // Record cleanup function to prevent leak if component is destroyed mid-drag
      activeCleanup = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        if (animationFrame) {
          cancelAnimationFrame(animationFrame)
          animationFrame = 0
        }
      }
    }

    activeDragHandle = handleEl
    handleEl.addEventListener('mousedown', onMouseDown)
  }

  /**
   * 解除拖拽行为绑定，移除所有事件监听
   * Unbind drag behavior, remove all event listeners
   */
  const unbindDrag = () => {
    // 清理可能正在进行的拖拽操作 / Clean up any ongoing drag operation
    activeCleanup?.()
    activeCleanup = null

    if (activeDragHandle && onMouseDown) {
      activeDragHandle.removeEventListener('mousedown', onMouseDown)
      activeDragHandle = null
      onMouseDown = null
    }
  }

  return { bindDrag, unbindDrag }
}
