import { createApp } from 'vue'
import VueLiteLayer, { PositionPreset } from 'vue-lite-layer'
import type {
  LayerCallback,
  LayerConfig,
  LayerGlobalConfig,
  LayerInstance,
  LocaleMessages
} from 'vue-lite-layer'
import type { ModuleOptions } from 'vue-lite-layer/nuxt'

const app = createApp({})
app.use(VueLiteLayer, { banner: false })

const config: LayerConfig = {
  title: 'Packaged layer',
  textContent: 'Plain text',
  contentType: 'text'
}

const callback: LayerCallback<{ id: string }> = (message) => {
  if (message) {
    message.id.toUpperCase()
  }
}

const globalConfig: LayerGlobalConfig = {
  banner: false,
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
    nested: {
      close: 'Close'
    }
  }
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

const moduleOptions: ModuleOptions = {
  banner: false,
  teleport: 'body',
  location: PositionPreset.CENTER_CENTER
}

void config
void callback
void globalConfig
void localeMessages
void instance
void moduleOptions
