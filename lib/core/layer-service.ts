import type { AppContext, InjectionKey } from 'vue'
import type { LayerConfig } from '@lib/types/layer'
import type { LayerInstance } from '@lib/types/instance'

export interface LayerService {
  /**
   * `sourceProvides` is supplied by useLiteLayer for component-tree scoped
   * injections (for example Element Plus ElConfigProvider). It is optional so
   * the public `$layer.open(options, appContext)` API remains unchanged.
   */
  open: (
    options?: LayerConfig,
    appContext?: AppContext,
    sourceProvides?: AppContext['provides']
  ) => LayerInstance | null
  close: (instance: LayerInstance | null) => void
  closeAll: () => void
}

export const LayerServiceKey: InjectionKey<LayerService> = Symbol('vue-lite-layer-service')
