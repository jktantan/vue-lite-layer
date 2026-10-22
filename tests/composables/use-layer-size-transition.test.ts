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

  test('restores the element previous inline transition', () => {
    const el = document.createElement('div')
    el.style.transition = 'opacity 1s linear'
    document.body.appendChild(el)
    const onComplete = vi.fn()

    withTransition(el, () => {}, onComplete)
    expect(el.style.transition).toBe(transitionValue)

    el.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true }))
    expect(el.style.transition).toBe('opacity 1s linear')
    expect(onComplete).toHaveBeenCalledTimes(1)

    el.remove()
  })

  test('applies the final layout immediately when reduced motion is requested', () => {
    const el = document.createElement('div')
    el.style.transition = 'opacity 1s linear'
    document.body.appendChild(el)
    const callback = vi.fn()
    const onComplete = vi.fn()
    const matchMedia = vi.fn().mockReturnValue({ matches: true })
    vi.stubGlobal('matchMedia', matchMedia)

    try {
      const cleanup = withTransition(el, callback, onComplete)

      expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
      expect(callback).toHaveBeenCalledTimes(1)
      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(el.style.transition).toBe('opacity 1s linear')
      expect(cleanup).toBeTypeOf('function')
    } finally {
      vi.unstubAllGlobals()
      el.remove()
    }
  })
})