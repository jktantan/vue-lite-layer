import type { App, Plugin } from 'vue'
import LiteLayer from '@lib/LiteLayer.vue'
import printVersion from '@lib/core/banner'
import { createLayerService, useLayerEvent, useLiteLayer } from '@lib/core/layer-runtime'
import { LayerServiceKey } from '@lib/core/layer-service'
import type { LayerGlobalConfig } from '@lib/types/layer'

/** Installs the public layer service into a host Vue application. */
LiteLayer.install = (app: App, globalOptions?: LayerGlobalConfig) => {
  if (typeof window !== 'undefined' && globalOptions?.banner !== false) {
    printVersion(import.meta.env.PACKAGE_VERSION)
  }

  const service = createLayerService(globalOptions)
  app.provide(LayerServiceKey, service)
  app.provide('layer', service)
  app.config.globalProperties.$layer = service
}

export { useLiteLayer, useLayerEvent }
export type {
  LayerArea,
  LayerConfig,
  LayerContentType,
  LayerCloseContext,
  LayerCloseReason,
  LayerCloseResult,
  LayerBeforeClose,
  LayerLifecycleCallback,
  LayerGlobalConfig,
  PixelSize,
  Position,
  WindowSize
} from '@lib/types/layer'
export { PositionPreset } from '@lib/types/layer'
export type { LayerCallback } from '@lib/types/callback'
export type { LayerInstance } from '@lib/types/instance'
export type { LocaleMessages } from '@lib/i18n'

const VueLiteLayerPlugin: Plugin<[LayerGlobalConfig?]> = {
  install: LiteLayer.install
}

export default VueLiteLayerPlugin
