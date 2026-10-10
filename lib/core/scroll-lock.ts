let lockCount = 0
let originalOverflow = ''
let originalPaddingRight = ''

const getScrollbarWidth = (): number => {
  // Prefer clientWidth (excludes the scrollbar itself) so the measurement is
  // independent of the current scrollbar state. Fall back to window.innerWidth
  // only when documentElement is unavailable (e.g. SSR or exotic hosts) and
  // treat the absence of either as a 0-width scrollbar.
  if (typeof document === 'undefined') return 0
  const docEl = document.documentElement
  if (docEl) {
    return Math.max(0, window.innerWidth - docEl.clientWidth)
  }
  return 0
}

/** Lock document scrolling with reference counting for stacked modal layers. */
export const lockBodyScroll = (): void => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  lockCount += 1
  if (lockCount !== 1) return

  const body = document.body
  if (!body) return
  originalOverflow = body.style.overflow
  originalPaddingRight = body.style.paddingRight
  const scrollbarWidth = getScrollbarWidth()
  body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) {
    const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0
    body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`
  }
}

/** Release one modal scroll lock and restore styles after the final release. */
export const unlockBodyScroll = (): void => {
  if (typeof document === 'undefined' || lockCount === 0) return
  lockCount -= 1
  if (lockCount !== 0) return

  const body = document.body
  if (!body) return
  body.style.overflow = originalOverflow
  body.style.paddingRight = originalPaddingRight
  originalOverflow = ''
  originalPaddingRight = ''
}

export const resetScrollLockForTest = (): void => {
  lockCount = 0
  originalOverflow = ''
  originalPaddingRight = ''
}
