import { PositionPreset, type Position, type WindowSize } from '../types/layer'
import type { LocaleMessages } from '../i18n'

export interface ModuleOptions {
  footer?: boolean | string
  shade?: boolean
  shadeClose?: boolean
  maxWidth?: string
  maxHeight?: string
  size?: WindowSize
  location?: Position | PositionPreset
  teleport?: string
  max?: boolean
  close?: boolean
  banner?: boolean
  i18n?: { locale?: string; messages?: LocaleMessages }
}

type ModuleOptionsRecord = Record<string, unknown>
type SerializablePrimitive = string | number | boolean | null
type SerializableValue =
  SerializablePrimitive | SerializableValue[] | { [key: string]: SerializableValue }

const POSITION_PRESET_VALUES = new Set<string>(Object.values(PositionPreset))

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

export const pickSerializableModuleOptions = (options: unknown): ModuleOptions => {
  const optionsRecord = toOptionsRecord(options)
  if (optionsRecord === undefined) return {}

  const size = pickWindowSize(optionsRecord.size)
  const location = pickLocation(optionsRecord.location)
  const i18n = pickSerializableI18n(optionsRecord.i18n)

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
    ...(isBooleanOption(optionsRecord.close) ? { close: optionsRecord.close } : {}),
    ...(isBooleanOption(optionsRecord.banner) ? { banner: optionsRecord.banner } : {}),
    ...(i18n !== undefined ? { i18n } : {})
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

  if (optionsRecord.close !== undefined && !isBooleanOption(optionsRecord.close)) {
    warnInvalidOption('close', 'a boolean')
  }

  if (optionsRecord.banner !== undefined && !isBooleanOption(optionsRecord.banner)) {
    warnInvalidOption('banner', 'a boolean')
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
}
