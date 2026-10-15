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

  // Track whether the current error has already been surfaced through any
  // path so we don't double-fire onError when the same error instance arrives
  // from multiple sources (e.g. timeout fires first, then a render error
  // bubbling into onErrorCaptured for the same error).
  let lastReportedError: unknown
  const markReported = (error: unknown): void => {
    lastReportedError = error
  }
  const clearReportedError = (): void => {
    lastReportedError = undefined
  }
  const isSameError = (error: unknown): boolean => {
    if (error === lastReportedError) return true
    if (error instanceof Error && lastReportedError instanceof Error) {
      return error.message === lastReportedError.message && error.name === lastReportedError.name
    }
    return false
  }
  const reportError = (error: unknown): void => {
    if (isSameError(error)) return
    clearLoadingTimeout()
    contentError.value = error
    getConfig()?.onError?.(error)
    markReported(error)
  }

  const handlePending = (): void => {
    clearLoadingTimeout()
    const config = getConfig()
    const timeout = config?.timeout
    if (!timeout || timeout <= 0) return

    loadingTimeout = setTimeout(() => {
      loadingTimeout = null
      const error = new Error(`Async layer content timed out after ${timeout}ms`)
      config?.onTimeout?.()
      // Go through reportError so the timeout and a downstream onErrorCaptured
      // for the same error instance don't both fire onError.
      reportError(error)
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
      // Clear the dedup state so a new failure after retry can be reported.
      clearReportedError()
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
    clearReportedError()
  }

  onErrorCaptured((error) => {
    // Surface the error to the retry UI but do NOT swallow it: returning
    // `false` here would mask errors from ancestor errorCaptured handlers and
    // from app-level errorHandler. Use deduplication so the same error
    // instance (e.g. fired by handlePending's timeout and then by a render
    // path) only surfaces the retry UI and onError once.
    reportError(error)
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
