import { createI18n } from 'vue-i18n-lite'

/**
 * 内置语言文件缓存（模块级单例，仅解析一次）
 * Built-in language file cache (module-level singleton, parsed only once)
 */
let builtInMessagesCache: Record<string, any> | null = null

const modules = import.meta.glob('./lang/*', { eager: true })

/**
 * 解析并缓存内置语言文件
 * Parse and cache built-in language files
 */
function getBuiltInMessages(): Record<string, any> {
  if (builtInMessagesCache) return builtInMessagesCache

  const messages: Record<string, any> = {}
  for (const path in modules) {
    const mod = modules[path] as any
    if (mod.default) {
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
  const getI18n = (localeI18n?: { locale?: string; messages?: Record<string, any> }) => {
    const builtIn = getBuiltInMessages()
    // 浅拷贝内置消息，避免污染缓存 / Shallow copy built-in messages to avoid polluting cache
    const combinedMessages: Record<string, any> = {}
    for (const locale in builtIn) {
      combinedMessages[locale] = { ...builtIn[locale] }
    }

    if (localeI18n?.messages) {
      for (const locale in localeI18n.messages) {
        combinedMessages[locale] = {
          ...combinedMessages[locale],
          ...localeI18n.messages[locale]
        }
      }
    }

    return createI18n({
      locale: localeI18n?.locale ?? 'zh-CN',
      fallbackLocale: 'en',
      messages: combinedMessages
    })
  }

  return { getI18n }
}
