import { afterEach, describe, expect, test } from 'vitest'
import { lockBodyScroll, resetScrollLockForTest, unlockBodyScroll } from '@lib/core/scroll-lock'

afterEach(() => {
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
  resetScrollLockForTest()
})

describe('body scroll lock', () => {
  test('restores original styles after the final nested lock is released', () => {
    document.body.style.overflow = 'auto'
    document.body.style.paddingRight = '6px'

    lockBodyScroll()
    lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    expect(Number.parseFloat(document.body.style.paddingRight)).toBeGreaterThan(6)

    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('auto')
    expect(document.body.style.paddingRight).toBe('6px')
  })

  test('does nothing when unlocked more times than it was locked', () => {
    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('')
  })
})
