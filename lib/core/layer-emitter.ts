import type { Emitter } from 'mitt'
import { type App, inject, type InjectionKey } from 'vue'
import type { LayerEvents } from '@lib/core/layer-events'

export type LayerEmitter = Emitter<LayerEvents>

export const LayerEmitterKey: InjectionKey<LayerEmitter> = Symbol('vue-lite-layer-emitter')

/**
 * 扩展 Vue 组件自定义属性类型声明
 * Extend Vue component custom property type declarations
 */
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $layerEmitter: LayerEmitter
  }
}

export const createLayerEmitterPlugin = (emitter: LayerEmitter) => ({
  install(app: App) {
    app.provide(LayerEmitterKey, emitter)
    app.provide('layerEmitter', emitter)
  }
})

/**
 * 获取当前弹层的事件总线
 * Get current layer's event bus
 *
 * 通过 Vue 的 inject 机制获取，仅在弹层内部组件中可用。
 * Obtained via Vue's inject mechanism, only available within layer internal components.
 *
 * @returns mitt emitter 实例 / mitt emitter instance
 */
export const useLayerEmitter = (): LayerEmitter => {
  const emitter = inject(LayerEmitterKey) ?? inject<LayerEmitter>('layerEmitter')
  if (!emitter) {
    throw new Error('[vue-lite-layer] layer emitter is only available inside a layer app')
  }
  return emitter
}
