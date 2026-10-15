import { describe, expect, test, vi } from 'vitest'
import {
  transitionDuration,
  transitionValue,
  withTransition
} from '@lib/composables/use-layer-size'

describe('use-layer-size transition utility', () => {
  test('exports the documented duration and value', () => {
    expect(transitionDuration).toBe(200)
    expect(transitionValue).toContain('top 200ms ease')
    expect(transitionValue).toContain('width 200ms ease')
  })

  test('runs the callback with a transition style and clears it on transitionend', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const cb = vi.fn()
    const onComplete = vi.fn()
    withTransition(el, cb, onComplete)

    expect(el.style.transition).toBe(transitionValue)
    expect(cb).toHaveBeenCalledTimes(1)

    el.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true }))
    expect(el.style.transition).toBe('')
    expect(onComplete).toHaveBeenCalledTimes(1)

    el.remove()
  })

  test('falls back to clearing the transition via setTimeout when transitionend is absent', () => {
    vi.useFakeTimers()
    try {
      const el = document.createElement('div')
      document.body.appendChild(el)
      const onComplete = vi.fn()
      withTransition(el, () => {}, onComplete)
      vi.advanceTimersByTime(transitionDuration + 50)
      expect(el.style.transition).toBe('')
      expect(onComplete).toHaveBeenCalledTimes(1)
      el.remove()
    } finally {
      vi.useRealTimers()
    }
  })
})