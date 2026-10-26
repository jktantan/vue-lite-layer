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

  test('keeps serializable theme configuration', () => {
    const picked = pickSerializableModuleOptions({
      theme: {
        mode: 'auto',
        size: 'small',
        colors: { primary: '#7c3aed', unknown: '#fff', danger: 1 },
        vars: {
          '--lite-layer-border-radius': '8px',
          '--not-a-layer-var': '1px',
          '--lite-layer-color-primary': 42
        }
      }
    })

    expect(picked.theme).toEqual({
      mode: 'auto',
      size: 'small',
      colors: { primary: '#7c3aed' },
      vars: { '--lite-layer-border-radius': '8px' }
    })
  })

  test('accepts a bare theme name and rejects invalid theme values', () => {
    expect(pickSerializableModuleOptions({ theme: 'dark' }).theme).toBe('dark')
    expect(pickSerializableModuleOptions({ theme: '   ' }).theme).toBeUndefined()
    expect(pickSerializableModuleOptions({ theme: 42 }).theme).toBeUndefined()
    expect(pickSerializableModuleOptions({ theme: { size: 'huge' } }).theme).toBeUndefined()
    expect(
      pickSerializableModuleOptions({ theme: { colors: { primary: 1 } } }).theme
    ).toBeUndefined()
  })

  test('warns for invalid theme fields', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      warnUnsupportedModuleOptions({
        theme: {
          mode: 1,
          size: 'huge',
          colors: { unknown: '#fff', primary: 1 },
          vars: { '--not-a-layer-var': '1px', '--lite-layer-color-primary': 1 }
        }
      })

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('theme.mode'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('theme.size'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('theme.colors.unknown'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('theme.colors.primary'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('theme.vars'))
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('theme.vars.--lite-layer-color-primary')
      )
    } finally {
      warn.mockRestore()
    }
  })
})
