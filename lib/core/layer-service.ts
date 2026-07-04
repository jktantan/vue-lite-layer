import type { AppContext, InjectionKey } from 'vue'
import type { LayerConfig } from '@lib/types/layer'
import type { LayerInstance } from '@lib/types/instance'

export interface LayerService {
  open: (options?: LayerConfig, appContext?: AppContext) => LayerInstance | null
  close: (instance: LayerInstance | null) => void
  closeAll: () => void
}

export const LayerServiceKey: InjectionKey<LayerService> = Symbol('vue-lite-layer-service')
