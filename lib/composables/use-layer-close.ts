import { ref, type Ref } from 'vue'
import type { LayerEmitter } from '@lib/core/layer-emitter'
import type { LayerCloseContext, LayerConfig } from '@lib/types/layer'

const LEAVE_ANIMATION_FALLBACK_MS = 220

type CloseLifecycleOptions = Pick<LayerConfig, 'beforeClose' | 'onClose' | 'onClosed'>

export interface LayerCloseController {
  visible: Ref<boolean>
  leaveAnim: Ref<boolean>
  isUnmounted: Ref<boolean>
  requestClose: (context: LayerCloseContext) => Promise<void>
  finalizeClose: () => void
  dispose: () => void
}

/**
 * Owns the close state machine for a layer instance.
 *
 * Keeping this out of the render component makes all close entry points
 * (header, shade, Escape, footer and service calls) follow exactly the same
 * guard, animation fallback and cleanup sequence.
 */
export const useLayerClose = (
  options: CloseLifecycleOptions,
  emitter: LayerEmitter,
  onLeaveStart: () => void
): LayerCloseController => {
  const visible = ref(true)
  const leaveAnim = ref(false)
  const isUnmounted = ref(false)
  let closePending = false
  let closeContext: LayerCloseContext = { reason: 'programmatic' }
  let closeFallbackTimer: ReturnType<typeof setTimeout> | null = null

  const clearFallbackTimer = (): void => {
    if (closeFallbackTimer) {
      clearTimeout(closeFallbackTimer)
      closeFallbackTimer = null
    }
  }

  const finalizeClose = (): void => {
    if (isUnmounted.value) return
    isUnmounted.value = true
    clearFallbackTimer()
    visible.value = false
    options.onClosed?.(closeContext)
    emitter.emit('closed', closeContext)
    emitter.emit('unmount')
  }

  const beginClose = (): void => {
    if (leaveAnim.value || isUnmounted.value) return
    leaveAnim.value = true
    onLeaveStart()
    closeFallbackTimer = setTimeout(finalizeClose, LEAVE_ANIMATION_FALLBACK_MS)
  }

  const requestClose = async (context: LayerCloseContext): Promise<void> => {
    if (leaveAnim.value || isUnmounted.value || closePending) return
    closePending = true
    try {
      // No guard means no asynchronous boundary: callers can immediately
      // observe the leave state and animation fallback timer.
      const allowed = options.beforeClose ? await options.beforeClose(context) : true
      if (allowed === false) return
      closeContext = context
      options.onClose?.(context)
      beginClose()
    } catch (error) {
      // A rejected guard cancels closing while avoiding an unhandled promise.
      console.error('[vue-lite-layer] beforeClose rejected', error)
    } finally {
      closePending = false
    }
  }

  return {
    visible,
    leaveAnim,
    isUnmounted,
    requestClose,
    finalizeClose,
    dispose: clearFallbackTimer
  }
}
