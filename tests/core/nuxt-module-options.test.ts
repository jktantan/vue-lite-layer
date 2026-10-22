import { describe, expect, test, vi } from 'vitest'
import {
  pickSerializableModuleOptions,
  warnUnsupportedModuleOptions
} from '@lib/nuxt/module-options'

describe('nuxt module options', () => {
  test('keeps the supported layer boolean options', () => {
    const picked = pickSerializableModuleOptions({
      min: true,
      closeOnOk: true,
      closeOnEsc: false,
      trapFocus: false,
      restoreFocus: false,
      max: false,
      close: false,
      banner: false
    })

    expect(picked).toMatchObject({
      min: true,
      closeOnOk: true,
      closeOnEsc: false,
      trapFocus: false,
      restoreFocus: false,
      max: false,
      close: false,
      banner: false
    })
  })

  test('drops unsupported values and warns for invalid new options', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const picked = pickSerializableModuleOptions({ min: 'yes', trapFocus: 1 })
      expect(picked.min).toBeUndefined()
      expect(picked.trapFocus).toBeUndefined()

      warnUnsupportedModuleOptions({ min: 'yes', trapFocus: 1 })
      expect(warn).toHaveBeenCalledTimes(2)
    } finally {
      warn.mockRestore()
    }
  })
})
