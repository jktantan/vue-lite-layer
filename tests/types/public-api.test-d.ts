import { createApp } from 'vue'
import VueLiteLayer, { PositionPreset } from 'vue-lite-layer'
import type {
  LayerArea,
  LayerCallback,
  LayerConfig,
  LayerContentType,
  LayerGlobalConfig,
  LayerInstance,
  LocaleMessages,
  PixelSize,
  Position,
  WindowSize
} from 'vue-lite-layer'

const app = createApp({})
app.use(VueLiteLayer, { banner: false })

const config: LayerConfig = {
  title: 'Typed layer',
  textContent: 'Plain text',
  contentType: 'text'
}

const globalConfig: LayerGlobalConfig = {
  banner: false,
  shade: true,
  i18n: {
    locale: 'en',
    messages: {
      en: {
        ok: 'OK'
      }
    }
  }
}

const localeMessages: LocaleMessages = {
  en: {
    ok: 'OK',
    count: 1,
    enabled: true,
    nested: {
      close: 'Close'
    }
  }
}

type DefaultCallbackPayload = Parameters<LayerCallback>[0]
const defaultCallbackPayload = {} as DefaultCallbackPayload
// @ts-expect-error default callback payload is unknown and must be narrowed before property access
defaultCallbackPayload.id

const callback: LayerCallback = (commandOrMessage?: unknown, message?: unknown) => {
  void commandOrMessage
  void message
}
callback('ok', { source: 'public-api-test' })

const typedPayloadCallback: LayerCallback<{ id: string }> = (message) => {
  if (message) {
    message.id.toUpperCase()
  }
}

const typedConfig: LayerConfig = {
  onOk: typedPayloadCallback
}

const instance: LayerInstance = {
  id: 'a',
  teleportTarget: 'body',
  teleportKey: 'body',
  close: () => true,
  bringToTop: () => {},
  maximize: () => {},
  restore: () => {}
}

const _area: LayerArea = { top: '0', left: '0', width: '1px', height: '1px' }
const _size: WindowSize = { width: '1px' }
const _pixel: PixelSize = { width: 1, height: 1 }
const _position: Position = { top: '0', left: '0' }
const _preset = PositionPreset.CENTER_CENTER
const _contentType: LayerContentType = 'html'

void config
void globalConfig
void localeMessages
void callback
void typedConfig
void instance
void _area
void _size
void _pixel
void _position
void _preset
void _contentType
