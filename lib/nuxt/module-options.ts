import {
  PositionPreset,
  type Position,
  type PositionPresetValue,
  type WindowSize
} from '../types/layer'
import type {
  LayerComponentSize,
  LayerTheme,
  LayerThemeColors,
  LayerThemeConfig,
  LayerThemeVars
} from '../types/theme'
import type { LocaleMessages } from '../i18n'

export interface ModuleOptions {
  footer?: boolean | string
  shade?: boolean
  shadeClose?: boolean
  maxWidth?: string
  maxHeight?: string
  size?: WindowSize
  location?: Position | PositionPreset | PositionPresetValue
  teleport?: string
  max?: boolean
  min?: boolean
  close?: boolean
  closeOnOk?: boolean
  closeOnEsc?: boolean
  trapFocus?: boolean
  restoreFocus?: boolean
  banner?: boolean
  /**
   * 是否自动把库样式注入到 Nuxt 的 CSS 列表，默认 true。
   *
   * 宿主需要控制样式加载顺序（例如在其后加载自己的适配层）时设为 false，
   * 并在 nuxt.config.ts 的 css 中自行登记 'vue-lite-layer/style.css'。
   */
  css?: boolean
  i18n?: { locale?: string; messages?: LocaleMessages }
  theme?: LayerTheme
}

type ModuleOptionsRecord = Record<string, unknown>
type SerializablePrimitive = string | number | boolean | null
type SerializableValue =
  SerializablePrimitive | SerializableValue[] | { [key: string]: SerializableValue }

const POSITION_PRESET_VALUES = new Set<string>(Object.values(PositionPreset))
const THEME_SIZES = new Set<string>(['small', 'default', 'large'])
const THEME_COLOR_TYPES = new Set<string>([
  'primary',
  'success',
  'warning',
  'danger',
  'error',
  'info'
])
const THEME_VAR_PREFIX = '--lite-layer-'

const warnInvalidOption = (path: string, expected: string): void => {
  console.warn(
    `[vue-lite-layer/nuxt] vueLiteLayer.${path} must be ${expected} in nuxt.config or runtimeConfig.public.`
  )
}

const isPlainObject = (value: unknown): value is ModuleOptionsRecord => {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const toOptionsRecord = (options: unknown): ModuleOptionsRecord | undefined => {
  return isPlainObject(options) ? options : undefined
}

const isSerializableValue = (value: unknown): value is SerializableValue => {
  if (value === null) return true

  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isSerializableValue)
  }

  if (!isPlainObject(value)) return false

  return Object.values(value).every(isSerializableValue)
}

const cloneSerializableValue = (value: SerializableValue): SerializableValue => {
  if (Array.isArray(value)) {
    return value.map(cloneSerializableValue)
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        cloneSerializableValue(entryValue as SerializableValue)
      ])
    )
  }

  return value
}

const isFooterOption = (value: unknown): value is ModuleOptions['footer'] => {
  return typeof value === 'boolean' || typeof value === 'string'
}

const isBooleanOption = (value: unknown): value is boolean => {
  return typeof value === 'boolean'
}

const isStringOption = (value: unknown): value is string => {
  return typeof value === 'string'
}

const pickWindowSize = (value: unknown): WindowSize | undefined => {
  if (!isPlainObject(value)) return undefined

  const entries = Object.entries(value)
  const hasExpectedShape = entries.every(([key, entryValue]) => {
    return (key === 'width' || key === 'height') && typeof entryValue === 'string'
  })

  if (!hasExpectedShape) return undefined

  return {
    ...(typeof value.width === 'string' ? { width: value.width } : {}),
    ...(typeof value.height === 'string' ? { height: value.height } : {})
  }
}

const pickPosition = (value: unknown): Position | undefined => {
  if (!isPlainObject(value)) return undefined

  const entries = Object.entries(value)
  const hasExpectedShape =
    entries.length === 2 &&
    entries.every(([key, entryValue]) => {
      return (key === 'top' || key === 'left') && typeof entryValue === 'string'
    })

  if (!hasExpectedShape || typeof value.top !== 'string' || typeof value.left !== 'string') {
    return undefined
  }

  return { top: value.top, left: value.left }
}

const pickLocation = (value: unknown): ModuleOptions['location'] => {
  if (typeof value === 'string' && POSITION_PRESET_VALUES.has(value)) {
    return value as PositionPreset
  }

  return pickPosition(value)
}

const isLocaleMessages = (messages: unknown): messages is LocaleMessages => {
  if (!isPlainObject(messages)) return false

  return Object.values(messages).every((message) => {
    return isPlainObject(message) && isSerializableValue(message)
  })
}

const cloneLocaleMessages = (messages: LocaleMessages): LocaleMessages => {
  return Object.fromEntries(
    Object.entries(messages).map(([locale, message]) => {
      return [locale, cloneSerializableValue(message as SerializableValue)]
    })
  ) as LocaleMessages
}

const pickSerializableI18n = (i18n: unknown): ModuleOptions['i18n'] => {
  if (!isPlainObject(i18n)) return undefined

  const localeOption = typeof i18n.locale === 'string' ? { locale: i18n.locale } : {}
  const messagesOption = isLocaleMessages(i18n.messages)
    ? { messages: cloneLocaleMessages(i18n.messages) }
    : {}
  const serializableI18n = { ...localeOption, ...messagesOption }

  if (Object.keys(serializableI18n).length === 0) return undefined

  return serializableI18n
}

/** 只保留可序列化且合法的主题配置 / Keep only serializable, valid theme config */
const pickTheme = (theme: unknown): LayerTheme | undefined => {
  if (typeof theme === 'string') return theme.trim() || undefined
  if (!isPlainObject(theme)) return undefined

  const picked: LayerThemeConfig = {}

  if (typeof theme.mode === 'string' && theme.mode.trim()) {
    picked.mode = theme.mode.trim()
  }

  if (typeof theme.size === 'string' && THEME_SIZES.has(theme.size)) {
    picked.size = theme.size as LayerComponentSize
  }

  if (isPlainObject(theme.colors)) {
    const colors: LayerThemeColors = {}
    for (const [type, value] of Object.entries(theme.colors)) {
      if (!THEME_COLOR_TYPES.has(type)) continue
      if (typeof value !== 'string' || !value.trim()) continue
      colors[type as keyof LayerThemeColors] = value
    }
    if (Object.keys(colors).length > 0) picked.colors = colors
  }

  if (isPlainObject(theme.vars)) {
    const vars: LayerThemeVars = {}
    for (const [name, value] of Object.entries(theme.vars)) {
      if (!name.startsWith(THEME_VAR_PREFIX)) continue
      if (typeof value !== 'string' || !value.trim()) continue
      vars[name as keyof LayerThemeVars] = value
    }
    if (Object.keys(vars).length > 0) picked.vars = vars
  }

  return Object.keys(picked).length > 0 ? picked : undefined
}

export const pickSerializableModuleOptions = (options: unknown): ModuleOptions => {
  const optionsRecord = toOptionsRecord(options)
  if (optionsRecord === undefined) return {}

  const size = pickWindowSize(optionsRecord.size)
  const location = pickLocation(optionsRecord.location)
  const i18n = pickSerializableI18n(optionsRecord.i18n)
  const theme = pickTheme(optionsRecord.theme)

  return {
    ...(isFooterOption(optionsRecord.footer) ? { footer: optionsRecord.footer } : {}),
    ...(isBooleanOption(optionsRecord.shade) ? { shade: optionsRecord.shade } : {}),
    ...(isBooleanOption(optionsRecord.shadeClose) ? { shadeClose: optionsRecord.shadeClose } : {}),
    ...(isStringOption(optionsRecord.maxWidth) ? { maxWidth: optionsRecord.maxWidth } : {}),
    ...(isStringOption(optionsRecord.maxHeight) ? { maxHeight: optionsRecord.maxHeight } : {}),
    ...(size !== undefined ? { size } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(isStringOption(optionsRecord.teleport) ? { teleport: optionsRecord.teleport } : {}),
    ...(isBooleanOption(optionsRecord.max) ? { max: optionsRecord.max } : {}),
    ...(isBooleanOption(optionsRecord.min) ? { min: optionsRecord.min } : {}),
    ...(isBooleanOption(optionsRecord.close) ? { close: optionsRecord.close } : {}),
    ...(isBooleanOption(optionsRecord.closeOnOk) ? { closeOnOk: optionsRecord.closeOnOk } : {}),
    ...(isBooleanOption(optionsRecord.closeOnEsc) ? { closeOnEsc: optionsRecord.closeOnEsc } : {}),
    ...(isBooleanOption(optionsRecord.trapFocus) ? { trapFocus: optionsRecord.trapFocus } : {}),
    ...(isBooleanOption(optionsRecord.restoreFocus)
      ? { restoreFocus: optionsRecord.restoreFocus }
      : {}),
    ...(isBooleanOption(optionsRecord.banner) ? { banner: optionsRecord.banner } : {}),
    ...(i18n !== undefined ? { i18n } : {}),
    ...(theme !== undefined ? { theme } : {})
  }
}

export const warnUnsupportedModuleOptions = (options: unknown): void => {
  if (options === undefined) return

  const optionsRecord = toOptionsRecord(options)
  if (optionsRecord === undefined) {
    warnInvalidOption('config', 'an object')
    return
  }

  if (optionsRecord.footer !== undefined && !isFooterOption(optionsRecord.footer)) {
    warnInvalidOption('footer', 'boolean or string')
  }

  if (optionsRecord.shade !== undefined && !isBooleanOption(optionsRecord.shade)) {
    warnInvalidOption('shade', 'a boolean')
  }

  if (optionsRecord.shadeClose !== undefined && !isBooleanOption(optionsRecord.shadeClose)) {
    warnInvalidOption('shadeClose', 'a boolean')
  }

  if (optionsRecord.maxWidth !== undefined && !isStringOption(optionsRecord.maxWidth)) {
    warnInvalidOption('maxWidth', 'a string')
  }

  if (optionsRecord.maxHeight !== undefined && !isStringOption(optionsRecord.maxHeight)) {
    warnInvalidOption('maxHeight', 'a string')
  }

  if (optionsRecord.size !== undefined && pickWindowSize(optionsRecord.size) === undefined) {
    warnInvalidOption('size', 'an object with optional string width and height')
  }

  if (optionsRecord.location !== undefined && pickLocation(optionsRecord.location) === undefined) {
    warnInvalidOption('location', 'a PositionPreset value or an object with string top and left')
  }

  if (optionsRecord.teleport !== undefined && !isStringOption(optionsRecord.teleport)) {
    warnInvalidOption('teleport', 'a string')
  }

  if (optionsRecord.max !== undefined && !isBooleanOption(optionsRecord.max)) {
    warnInvalidOption('max', 'a boolean')
  }

  if (optionsRecord.min !== undefined && !isBooleanOption(optionsRecord.min)) {
    warnInvalidOption('min', 'a boolean')
  }

  if (optionsRecord.close !== undefined && !isBooleanOption(optionsRecord.close)) {
    warnInvalidOption('close', 'a boolean')
  }

  if (optionsRecord.closeOnOk !== undefined && !isBooleanOption(optionsRecord.closeOnOk)) {
    warnInvalidOption('closeOnOk', 'a boolean')
  }

  if (optionsRecord.closeOnEsc !== undefined && !isBooleanOption(optionsRecord.closeOnEsc)) {
    warnInvalidOption('closeOnEsc', 'a boolean')
  }

  if (optionsRecord.trapFocus !== undefined && !isBooleanOption(optionsRecord.trapFocus)) {
    warnInvalidOption('trapFocus', 'a boolean')
  }

  if (optionsRecord.restoreFocus !== undefined && !isBooleanOption(optionsRecord.restoreFocus)) {
    warnInvalidOption('restoreFocus', 'a boolean')
  }

  if (optionsRecord.banner !== undefined && !isBooleanOption(optionsRecord.banner)) {
    warnInvalidOption('banner', 'a boolean')
  }

  if (optionsRecord.css !== undefined && !isBooleanOption(optionsRecord.css)) {
    warnInvalidOption('css', 'a boolean')
  }

  if (optionsRecord.i18n !== undefined && !isPlainObject(optionsRecord.i18n)) {
    warnInvalidOption('i18n', 'an object')
    return
  }

  if (isPlainObject(optionsRecord.i18n)) {
    if (optionsRecord.i18n.locale !== undefined && !isStringOption(optionsRecord.i18n.locale)) {
      warnInvalidOption('i18n.locale', 'a string')
    }

    if (
      optionsRecord.i18n.messages !== undefined &&
      !isLocaleMessages(optionsRecord.i18n.messages)
    ) {
      warnInvalidOption('i18n.messages', 'a JSON-serializable locale messages object')
    }
  }

  if (optionsRecord.theme !== undefined) {
    const theme = optionsRecord.theme

    if (typeof theme !== 'string' && !isPlainObject(theme)) {
      warnInvalidOption('theme', 'a theme name string or an object')
      return
    }

    if (!isPlainObject(theme)) return

    if (theme.mode !== undefined && !isStringOption(theme.mode)) {
      warnInvalidOption('theme.mode', 'a string')
    }

    if (theme.size !== undefined && (!isStringOption(theme.size) || !THEME_SIZES.has(theme.size))) {
      warnInvalidOption('theme.size', "'small', 'default' or 'large'")
    }

    if (theme.colors !== undefined && !isPlainObject(theme.colors)) {
      warnInvalidOption('theme.colors', 'an object')
    } else if (isPlainObject(theme.colors)) {
      for (const [type, value] of Object.entries(theme.colors)) {
        if (!THEME_COLOR_TYPES.has(type)) {
          warnInvalidOption(`theme.colors.${type}`, 'a known semantic color type')
        } else if (!isStringOption(value)) {
          warnInvalidOption(`theme.colors.${type}`, 'a string')
        }
      }
    }

    if (theme.vars !== undefined && !isPlainObject(theme.vars)) {
      warnInvalidOption('theme.vars', 'an object')
    } else if (isPlainObject(theme.vars)) {
      for (const [name, value] of Object.entries(theme.vars)) {
        if (!name.startsWith(THEME_VAR_PREFIX)) {
          warnInvalidOption('theme.vars', `CSS variables starting with '${THEME_VAR_PREFIX}'`)
        } else if (!isStringOption(value)) {
          warnInvalidOption(`theme.vars.${name}`, 'a string')
        }
      }
    }
  }
}
