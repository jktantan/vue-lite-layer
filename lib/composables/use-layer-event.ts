import { getCurrentScope, onScopeDispose } from 'vue'
import { type LayerEmitter, useLayerEmitter } from '@lib/core/layer-emitter'
import type { LayerCommandPayload, LayerEventDisposer } from '@lib/core/layer-events'
import type { LayerCallback } from '@lib/types/callback'

const registerDisposer = (dispose: LayerEventDisposer): LayerEventDisposer => {
  if (getCurrentScope()) {
    onScopeDispose(dispose)
  }
  return dispose
}

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
export default (providedEmitter?: LayerEmitter) => {
  const emitter = providedEmitter ?? useLayerEmitter()

  // ──── Footer 专用：通知 Container 按钮点击 / Footer Specific: Notify Container of Button Clicks ────

  /** 触发确认事件（Footer → Container） / Trigger confirm event (Footer → Container) */
  const emitOk = (message?: unknown): void => {
    emitter.emit('ok', message)
  }

  /** 触发取消事件（Footer → Container） / Trigger cancel event (Footer → Container) */
  const emitCancel = (message?: unknown): void => {
    emitter.emit('cancel', message)
  }

  /** 触发自定义命令事件（Footer → Container） / Trigger custom command event (Footer → Container) */
  const emitCommand = (command?: unknown, message?: unknown): void => {
    emitter.emit('command', { command, message })
  }

  // ──── Container 专用：监听 Footer 事件 / Container Specific: Listen to Footer Events ────

  /**
   * 监听确认按钮点击
   * Listen to confirm button click
   *
   * @param callback - 回调函数；若未提供，则默认关闭弹层 / Callback function; if not provided, closes layer by default
   */
  const onOk = (callback?: LayerCallback): LayerEventDisposer => {
    const handler = (message?: unknown) => {
      callback ? callback(message) : emitter.emit('requestClose', { reason: 'programmatic' })
    }
    emitter.on('ok', handler)
    return registerDisposer(() => emitter.off('ok', handler))
  }

  /**
   * 监听取消按钮点击
   * Listen to cancel button click
   *
   * @param callback - 回调函数；若未提供，则默认关闭弹层 / Callback function; if not provided, closes layer by default
   */
  const onCancel = (callback?: LayerCallback): LayerEventDisposer => {
    const handler = (message?: unknown) => {
      callback ? callback(message) : emitter.emit('requestClose', { reason: 'cancel' })
    }
    emitter.on('cancel', handler)
    return registerDisposer(() => emitter.off('cancel', handler))
  }

  /**
   * 监听自定义命令
   * Listen to custom command
   *
   * @param callback - 回调函数，接收命令标识作为参数 / Callback function that receives command identifier as parameter
   */
  const onCommand = (callback?: LayerCallback): LayerEventDisposer => {
    const handler = (payload: LayerCommandPayload) => {
      callback?.(payload.command, payload.message)
    }
    emitter.on('command', handler)
    return registerDisposer(() => emitter.off('command', handler))
  }

  // ──── Container 专用：向调用方传递处理结果 / Container Specific: Pass Processing Results to Caller ────

  /** 确认处理完成，将结果传递给 openLayer 的 onOk 回调 / Confirm processing complete, pass result to openLayer's onOk callback */
  const resolveOk = (message?: unknown): void => {
    emitter.emit('afterOk', message)
  }

  /** 取消处理完成，将结果传递给 openLayer 的 onCancel 回调 / Cancel processing complete, pass result to openLayer's onCancel callback */
  const resolveCancel = (message?: unknown): void => {
    emitter.emit('afterCancel', message)
  }

  /** 命令处理完成，将结果传递给 openLayer 的 onCommand 回调 / Command processing complete, pass result to openLayer's onCommand callback */
  const resolveCommand = (command?: unknown, message?: unknown): void => {
    emitter.emit('afterCommand', { command, message })
  }

  // ──── Container 专用：Loading 控制 / Container Specific: Loading Control ────

  /** 显示弹层加载遮罩 / Show layer loading mask */
  const startLoading = (): void => {
    emitter.emit('startLoading')
  }

  /** 隐藏弹层加载遮罩 / Hide layer loading mask */
  const stopLoading = (): void => {
    emitter.emit('stopLoading')
  }

  // ──── 通用 / General ────

  /** 直接关闭弹层 / Close layer directly */
  const close = (): void => {
    emitter.emit('requestClose', { reason: 'programmatic' })
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
