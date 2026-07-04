import { afterEach, describe, expect, test, vi } from 'vitest'
import { warnIfUnsafeHtml } from '@lib/core/html-safety'

const originalNodeEnv = process.env.NODE_ENV

describe('html safety helpers', () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  test('warns in browser for script-like trusted HTML during development', () => {
    process.env.NODE_ENV = 'development'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnIfUnsafeHtml('<img src=x onerror=alert(1)>')

    expect(warn).toHaveBeenCalledWith(
      '[vue-lite-layer] content string is rendered as trusted HTML. Use textContent for untrusted text.'
    )
  })

  test('does not warn for script-like trusted HTML during production', () => {
    process.env.NODE_ENV = 'production'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnIfUnsafeHtml('<img src=x onerror=alert(1)>')

    expect(warn).not.toHaveBeenCalled()
  })

  test('does not warn for plain trusted HTML text', () => {
    process.env.NODE_ENV = 'development'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnIfUnsafeHtml('<strong>Hello</strong>')

    expect(warn).not.toHaveBeenCalled()
  })
})
