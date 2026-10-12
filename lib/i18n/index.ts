import { createI18n } from 'vue-i18n-lite'
import type { I18nOptions } from 'vue-i18n-lite'

export type LocaleMessage = Record<string, unknown>

export type LocaleMessages = Record<string, LocaleMessage>
type I18nCompatibleMessages = NonNullable<I18nOptions['messages']>

const DANGEROUS_MESSAGE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const isSafeMessageKey = (key: string): boolean => {
  return !DANGEROUS_MESSAGE_KEYS.has(key)
}

const isPlainObject = (value: unknown): value is LocaleMessage => {
  if (typeof value !== 'object' || value === null) return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const cloneMessage = (message: LocaleMessage): LocaleMessage => {
  const cloned: LocaleMessage = {}

  for (const key of Object.keys(message)) {
    if (!isSafeMessageKey(key)) continue

    const value = message[key]
    cloned[key] = isPlainObject(value) ? cloneMessage(value) : value
  }

  return cloned
}

const mergeMessages = (base: LocaleMessage = {}, override: LocaleMessage = {}): LocaleMessage => {
  const merged = cloneMessage(base)

  for (const key of Object.keys(override)) {
    if (!isSafeMessageKey(key)) continue

    const baseValue = merged[key]
    const overrideValue = override[key]
    merged[key] = isPlainObject(overrideValue)
      ? isPlainObject(baseValue)
        ? mergeMessages(baseValue, overrideValue)
        : cloneMessage(overrideValue)
      : overrideValue
  }

  return merged
}

interface LocaleModule {
  default?: LocaleMessage
}

/**
 * 内置语言文件缓存（模块级单例，仅解析一次）
 * Built-in language file cache (module-level singleton, parsed only once)
 */
let builtInMessagesCache: LocaleMessages | null = null

const modules = import.meta.glob<LocaleModule>('./lang/*', { eager: true })

/**
 * 解析并缓存内置语言文件
 * Parse and cache built-in language files
 */
function getBuiltInMessages(): LocaleMessages {
  if (builtInMessagesCache) return builtInMessagesCache

  const messages: LocaleMessages = {}
  for (const path of Object.keys(modules)) {
    const mod = modules[path]
    if (mod?.default) {
      const name = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'))
      messages[name] = { ...messages[name], ...mod.default }
    }
  }
  builtInMessagesCache = messages
  return messages
}

/**
 * 创建 i18n 工具对象
 * Create i18n utility object
 */
export default () => {
  const getI18n = (localeI18n?: { locale?: string; messages?: LocaleMessages }) => {
    const builtIn = getBuiltInMessages()
    // Each `getI18n` call must not mutate cached messages, so we always clone
    // the built-ins once. The expensive part — re-cloning the built-in payload
    // for every openLayer call — is what we avoid: only locales the caller
    // actually overrides pay the merge cost, and that merge is cached.
    const combinedMessages: LocaleMessages = {}
    for (const locale of Object.keys(builtIn)) {
      combinedMessages[locale] = cloneMessage(builtIn[locale] ?? {})
    }

    if (localeI18n?.messages) {
      for (const locale of Object.keys(localeI18n.messages)) {
        if (!isSafeMessageKey(locale)) continue

        const override = localeI18n.messages[locale]
        // 不缓存合并结果：不同 openLayer 调用可能传不同的 override，
        // 按 locale 缓存会让后调用的 layer 复用前一次的 payload，
        // 出现"用户传入被忽略"或"层间互相污染"的 bug（参见 i18n.test.ts
        // ignores prototype pollution 用例）。
        // Don't cache the merged payload: different `openLayer` calls may
        // pass different overrides, and caching by locale lets later calls
        // reuse an earlier layer's payload, dropping the user's current
        // override or crossing-pollinating layers (see the i18n.test.ts
        // "ignores prototype pollution" cases).
        const mergedOverride = mergeMessages({}, override)

        combinedMessages[locale] = mergeMessages(combinedMessages[locale], mergedOverride)
      }
    }

    return createI18n({
      locale: localeI18n?.locale ?? 'zh-CN',
      fallbackLocale: 'en',
      messages: combinedMessages as I18nCompatibleMessages
    })
  }

  return { getI18n }
}
