import { createApp } from 'vue'
import VueLiteLayer, { PositionPreset } from 'vue-lite-layer'
import type {
  LayerCallback,
  LayerComponentSize,
  LayerConfig,
  LayerGlobalConfig,
  LayerInstance,
  LayerTheme,
  LayerThemeConfig,
  LocaleMessages,
  PositionPresetValue
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
  close: () => {},
  bringToTop: () => {},
  maximize: () => {},
  minimize: () => {},
  restore: () => {},
  update: () => {},
  closed: Promise.resolve({ reason: 'programmatic', action: 'close' })
}

const moduleOptions: ModuleOptions = {
  banner: false,
  teleport: 'body',
  location: 'CC',
  theme: {
    mode: 'dark',
    size: 'small',
    colors: { primary: '#7c3aed' },
    vars: { '--lite-layer-header-height': '52px' }
  }
}

const presetLocation: PositionPresetValue = 'CT'
const enumModuleOptions: ModuleOptions = {
  location: PositionPreset.CENTER_CENTER
}

const theme: LayerTheme = {
  mode: 'auto',
  size: 'large',
  colors: { success: '#16a34a' }
}
const themeConfig: LayerThemeConfig = { mode: 'light', size: 'default' }
const componentSize: LayerComponentSize = 'small'

void config
void callback
void globalConfig
void localeMessages
void instance
void moduleOptions
void presetLocation
void enumModuleOptions
void theme
void themeConfig
void componentSize
