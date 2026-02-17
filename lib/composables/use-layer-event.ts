import type { LayerCallback } from '@lib/types/callback'
import { useLayerEmitter } from '@lib/core/layer-emitter'

/**
 * 弹层事件 Composable
 * Layer Event Composable
 *
 * 供弹层内部组件使用，提供与弹层交互的事件发射和监听能力。
 * Used by internal layer components to provide event emission and listening capabilities for layer interaction.
 *
 * ### Footer 专用（通知 Container 按钮点击）
 * ### Footer Specific (Notify Container of Button Clicks)
 * - `emitOk()` — 触发确认 / Trigger confirm
 * - `emitCancel()` — 触发取消 / Trigger cancel
 * - `emitCommand(command)` — 触发自定义命令 / Trigger custom command
 *
 * ### Container 专用
 * ### Container Specific
 *
 * **监听 Footer 事件：**
 * **Listen to Footer Events:**
 * - `onOk(callback)` — 监听确认按钮点击 / Listen to confirm button click
 * - `onCancel(callback)` — 监听取消按钮点击 / Listen to cancel button click
 * - `onCommand(callback)` — 监听自定义命令 / Listen to custom command
 *
 * **向调用方传递处理结果：**
 * **Pass Processing Results to Caller:**
 * - `resolveOk(message?)` — 确认处理完成，将结果传递给 openLayer 的 onOk 回调 / Confirm processing complete, pass result to openLayer's onOk callback
 * - `resolveCancel(message?)` — 取消处理完成，将结果传递给 openLayer 的 onCancel 回调 / Cancel processing complete, pass result to openLayer's onCancel callback
 * - `resolveCommand(command, message?)` — 命令处理完成，将结果传递给 openLayer 的 onCommand 回调 / Command processing complete, pass result to openLayer's onCommand callback
 *
 * **Loading 控制：**
 * **Loading Control:**
 * - `startLoading()` — 显示弹层加载遮罩 / Show layer loading mask
 * - `stopLoading()` — 隐藏弹层加载遮罩 / Hide layer loading mask
 *
 * ### 通用
 * ### General
 * - `close()` — 直接关闭弹层 / Close layer directly
 */
export default () => {
  const emitter = useLayerEmitter()

  // ──── Footer 专用：通知 Container 按钮点击 / Footer Specific: Notify Container of Button Clicks ────

  /** 触发确认事件（Footer → Container） / Trigger confirm event (Footer → Container) */
  const emitOk = () => {
    emitter.emit('ok')
  }

  /** 触发取消事件（Footer → Container） / Trigger cancel event (Footer → Container) */
  const emitCancel = () => {
    emitter.emit('cancel')
  }

  /** 触发自定义命令事件（Footer → Container） / Trigger custom command event (Footer → Container) */
  const emitCommand = (command?: any) => {
    emitter.emit('command', command)
  }

  // ──── Container 专用：监听 Footer 事件 / Container Specific: Listen to Footer Events ────

  /**
   * 监听确认按钮点击
   * Listen to confirm button click
   *
   * @param callback - 回调函数；若未提供，则默认关闭弹层 / Callback function; if not provided, closes layer by default
   */
  const onOk = (callback?: LayerCallback) => {
    emitter.on('ok', () => {
      callback ? callback() : emitter.emit('close')
    })
  }

  /**
   * 监听取消按钮点击
   * Listen to cancel button click
   *
   * @param callback - 回调函数；若未提供，则默认关闭弹层 / Callback function; if not provided, closes layer by default
   */
  const onCancel = (callback?: LayerCallback) => {
    emitter.on('cancel', () => {
      callback ? callback() : emitter.emit('close')
    })
  }

  /**
   * 监听自定义命令
   * Listen to custom command
   *
   * @param callback - 回调函数，接收命令标识作为参数 / Callback function that receives command identifier as parameter
   */
  const onCommand = (callback?: LayerCallback) => {
    emitter.on('command', (command?: any) => {
      callback?.(command)
    })
  }

  // ──── Container 专用：向调用方传递处理结果 / Container Specific: Pass Processing Results to Caller ────

  /** 确认处理完成，将结果传递给 openLayer 的 onOk 回调 / Confirm processing complete, pass result to openLayer's onOk callback */
  const resolveOk = (message?: any) => {
    emitter.emit('afterOk', message)
  }

  /** 取消处理完成，将结果传递给 openLayer 的 onCancel 回调 / Cancel processing complete, pass result to openLayer's onCancel callback */
  const resolveCancel = (message?: any) => {
    emitter.emit('afterCancel', message)
  }

  /** 命令处理完成，将结果传递给 openLayer 的 onCommand 回调 / Command processing complete, pass result to openLayer's onCommand callback */
  const resolveCommand = (command: string, message?: any) => {
    emitter.emit('afterCommand', { command, message })
  }

  // ──── Container 专用：Loading 控制 / Container Specific: Loading Control ────

  /** 显示弹层加载遮罩 / Show layer loading mask */
  const startLoading = () => {
    emitter.emit('startLoading')
  }

  /** 隐藏弹层加载遮罩 / Hide layer loading mask */
  const stopLoading = () => {
    emitter.emit('stopLoading')
  }

  // ──── 通用 / General ────

  /** 直接关闭弹层 / Close layer directly */
  const close = () => {
    emitter.emit('close')
  }

  return {
    // Footer 专用 / Footer Specific
    emitOk,
    emitCancel,
    emitCommand,
    // Container 监听 / Container Listen
    onOk,
    onCancel,
    onCommand,
    // Container 传递结果 / Container Pass Results
    resolveOk,
    resolveCancel,
    resolveCommand,
    // Loading 控制 / Loading Control
    startLoading,
    stopLoading,
    // 通用 / General
    close
  }
}
