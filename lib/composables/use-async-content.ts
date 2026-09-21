import { computed, onErrorCaptured, ref } from 'vue'
import type { AsyncContentConfig } from '@lib/types/layer'

/**
 * Manages the loading timeout, error presentation and retry lifecycle for an
 * async layer component. Rendering stays in LayerContainer, so this state can
 * be tested independently from the content transport (Suspense, components or
 * future loaders).
 */
export const useAsyncContent = (getConfig: () => AsyncContentConfig | undefined) => {
  const contentError = ref<unknown>(null)
  const contentKey = ref(0)
  const retryCount = ref(0)
  const isRetrying = ref(false)
  let loadingTimeout: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  const canRetry = computed(() => {
    const maxRetries = getConfig()?.maxRetries
    return maxRetries == null || retryCount.value < maxRetries
  })

  const clearLoadingTimeout = (): void => {
    if (!loadingTimeout) return
    clearTimeout(loadingTimeout)
    loadingTimeout = null
  }

  const handlePending = (): void => {
    clearLoadingTimeout()
    const config = getConfig()
    const timeout = config?.timeout
    if (!timeout || timeout <= 0) return

    loadingTimeout = setTimeout(() => {
      loadingTimeout = null
      const error = new Error(`Async layer content timed out after ${timeout}ms`)
      contentError.value = error
      config?.onTimeout?.()
      config?.onError?.(error)
    }, timeout)
  }

  const retryContent = (): void => {
    if (!canRetry.value || isRetrying.value) return
    const config = getConfig()
    retryCount.value += 1
    config?.onRetry?.(retryCount.value)
    isRetrying.value = true

    const retry = () => {
      retryTimer = null
      contentError.value = null
      contentKey.value += 1
      isRetrying.value = false
    }
    const retryDelay = config?.retryDelay ?? 0
    if (retryDelay > 0) {
      retryTimer = setTimeout(retry, retryDelay)
    } else {
      retry()
    }
  }

  const reset = (): void => {
    clearLoadingTimeout()
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    contentError.value = null
    retryCount.value = 0
    isRetrying.value = false
  }

  onErrorCaptured((error) => {
    clearLoadingTimeout()
    contentError.value = error
    getConfig()?.onError?.(error)
    // The error is represented by the retry UI; do not also surface it as an
    // uncaught application error.
    return false
  })

  return {
    contentError,
    contentKey,
    isRetrying,
    canRetry,
    clearLoadingTimeout,
    handlePending,
    retryContent,
    reset
  }
}
