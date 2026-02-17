import type { Emitter, EventType } from 'mitt'
import { type App, inject } from 'vue'

/**
 * 扩展 Vue 组件自定义属性类型声明
 * Extend Vue component custom property type declarations
 */
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $layerEmitter: Emitter<Record<EventType, unknown>>
  }
}

/** 当前活跃的弹层 emitter 实例（在 open() 时设置） / Currently active layer emitter instance (set during open()) */
let currentEmitter: Emitter<Record<EventType, unknown>>

/**
 * Vue 插件 —— 将当前 emitter 注入到弹层 Vue 应用中
 * Vue Plugin — Inject current emitter into layer Vue app
 *
 * 每个弹层创建时，先通过 `setLayerEmitter()` 设置当前 emitter，
 * When each layer is created, first set current emitter via `setLayerEmitter()`,
 * 再 `.use(layerEmitterPlugin)` 将其 provide 给弹层内所有组件。
 * then `.use(layerEmitterPlugin)` to provide it to all components within the layer.
 */
const layerEmitterPlugin = {
  install(app: App) {
    app.provide('layerEmitter', currentEmitter)
  }
}

/**
 * 设置当前活跃的 emitter 实例
 * Set currently active emitter instance
 *
 * 在每次 `$layer.open()` 时调用，确保后续的 `layerEmitterPlugin.install`
 * Called during each `$layer.open()` to ensure subsequent `layerEmitterPlugin.install`
 * 能获取到正确的 emitter。
 * can obtain the correct emitter.
 *
 * @param emitter - mitt 事件总线实例 / mitt event bus instance
 */
export const setLayerEmitter = (emitter: Emitter<Record<EventType, unknown>>) => {
  currentEmitter = emitter
}

/**
 * 获取当前弹层的事件总线
 * Get current layer's event bus
 *
 * 通过 Vue 的 inject 机制获取，仅在弹层内部组件中可用。
 * Obtained via Vue's inject mechanism, only available within layer internal components.
 *
 * @returns mitt emitter 实例 / mitt emitter instance
 */
export const useLayerEmitter = <T extends Record<EventType, unknown>>(): Emitter<T> => {
  return inject('layerEmitter')!
}

export default layerEmitterPlugin
