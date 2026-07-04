import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, vi } from 'vitest'

class TestResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, 'ResizeObserver', {
  value: TestResizeObserver,
  writable: true
})

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: TestResizeObserver,
  writable: true
})

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})
