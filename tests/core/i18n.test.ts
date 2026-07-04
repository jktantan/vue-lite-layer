import { describe, expect, test } from 'vitest'
import i18n from '@lib/i18n'
import type { LocaleMessages } from '@lib/i18n'

describe('i18n', () => {
  test('deep merges local nested messages with built-in locale messages', () => {
    const plugin = i18n().getI18n({
      locale: 'en',
      messages: {
        en: {
          VueLiteLayer: {
            ok: 'Confirm'
          }
        }
      }
    })

    expect(plugin.t('VueLiteLayer.ok')).toBe('Confirm')
    expect(plugin.t('VueLiteLayer.cancel')).toBe('cancel')
  })

  test('ignores inherited locale message properties', () => {
    const messages = Object.create({
      en: {
        VueLiteLayer: {
          ok: 'Inherited override'
        }
      }
    }) as LocaleMessages

    const plugin = i18n().getI18n({
      locale: 'en',
      messages
    })

    expect(plugin.t('VueLiteLayer.ok')).toBe('ok')
  })

  test('ignores prototype pollution keys in locale messages', () => {
    const polluted = JSON.parse(
      '{"en":{"VueLiteLayer":{"ok":"Safe"},"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}}'
    ) as LocaleMessages

    const plugin = i18n().getI18n({
      locale: 'en',
      messages: polluted
    })
    const messages = plugin.getLocaleMessage('en') as Record<string, unknown>

    expect(plugin.t('VueLiteLayer.ok')).toBe('Safe')
    expect(Object.hasOwn(messages, '__proto__')).toBe(false)
    expect(Object.hasOwn(messages, 'constructor')).toBe(false)
    expect(Object.hasOwn(messages, 'prototype')).toBe(false)
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
  })

  test('ignores prototype pollution keys inside new nested message namespaces', () => {
    const polluted = JSON.parse(
      '{"en":{"Extra":{"label":"Safe","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}}}'
    ) as LocaleMessages

    const plugin = i18n().getI18n({
      locale: 'en',
      messages: polluted
    })
    const messages = plugin.getLocaleMessage('en') as Record<string, Record<string, unknown>>
    const extraMessages = messages.Extra

    expect(plugin.t('Extra.label')).toBe('Safe')
    expect(Object.hasOwn(extraMessages, '__proto__')).toBe(false)
    expect(Object.hasOwn(extraMessages, 'constructor')).toBe(false)
    expect(Object.hasOwn(extraMessages, 'prototype')).toBe(false)
  })
})
