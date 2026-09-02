let lockCount = 0
let originalOverflow = ''
let originalPaddingRight = ''

/** Lock document scrolling with reference counting for stacked modal layers. */
export const lockBodyScroll = (): void => {
  if (typeof document === 'undefined') return
  lockCount += 1
  if (lockCount !== 1) return

  const body = document.body
  originalOverflow = body.style.overflow
  originalPaddingRight = body.style.paddingRight
  const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
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
