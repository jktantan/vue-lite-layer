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
  // When a guard is async, additional close intents that arrive during the
  // pending guard are coalesced: only the most recent context is honored, but
  // every caller receives a Promise so they can still observe completion.
  let pendingContext: LayerCloseContext | null = null
  let pendingResolvers: Array<() => void> = []
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
    // User callbacks must never prevent the layer from being torn down. If
    // `onClosed` throws, still emit `unmount` so the isolated app unmounts and
    // layerManager drops the instance; otherwise the layer becomes a ghost.
    try {
      options.onClosed?.(closeContext)
    } catch (error) {
      console.error('[vue-lite-layer] onClosed failed', error)
    }
    try {
      emitter.emit('closed', closeContext)
    } catch (error) {
      console.error('[vue-lite-layer] closed listener failed', error)
    }
    try {
      emitter.emit('unmount')
    } catch (error) {
      console.error('[vue-lite-layer] unmount listener failed', error)
    }
  }

  const beginClose = (): void => {
    if (leaveAnim.value || isUnmounted.value) return
    leaveAnim.value = true
    onLeaveStart()
    closeFallbackTimer = setTimeout(finalizeClose, LEAVE_ANIMATION_FALLBACK_MS)
  }

  const requestClose = async (context: LayerCloseContext): Promise<void> => {
    if (isUnmounted.value) return
    if (leaveAnim.value) {
      // Leave animation has already started; nothing to do but resolve so the
      // caller's await does not hang.
      return
    }

    // Already mid-guard: remember the latest context and queue a resolver so
    // the caller still gets a Promise that settles when the cascade finishes.
    if (closePending) {
      pendingContext = context
      return new Promise<void>((resolve) => {
        pendingResolvers.push(resolve)
      })
    }

    closePending = true
    try {
      // No guard means no asynchronous boundary: callers can immediately
      // observe the leave state and animation fallback timer.
      const allowed = options.beforeClose ? await options.beforeClose(context) : true
      if (allowed === false) {
        // Guard rejected this intent: any newer intent that arrived during the
        // await still gets processed below in the same try/finally cycle.
        return
      }
      closeContext = context
      // A throwing onClose is a user bug; it must not be mistaken for a
      // rejected beforeClose guard, which would keep the layer open forever.
      try {
        options.onClose?.(context)
      } catch (error) {
        console.error('[vue-lite-layer] onClose failed', error)
      }
      beginClose()
    } catch (error) {
      // A rejected guard cancels closing while avoiding an unhandled promise.
      console.error('[vue-lite-layer] beforeClose rejected', error)
    } finally {
      closePending = false
      // Drain anything queued while we were awaiting the guard. We resolve the
      // queued resolvers first so callers awaiting them don't deadlock, then
      // recursively process the most recent intent.
      const queuedResolvers = pendingResolvers
      const nextContext = pendingContext
      pendingResolvers = []
      pendingContext = null
      for (const resolve of queuedResolvers) resolve()
      if (nextContext) {
        await requestClose(nextContext)
      }
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
