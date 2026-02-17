import mitt from 'mitt'
import { nanoid } from 'nanoid'
import { type App, createApp } from 'vue'
import type { AppContext } from 'vue'
import { defu } from 'defu'
import i18n from '@lib/i18n'
import layerManager from '@lib/core/layer-manager'
import printVersion from '@lib/core/banner'
import LiteLayer from '@lib/LiteLayer.vue'
import defaultConfig from '@lib/types/defaults'
import type { LayerConfig, LayerGlobalConfig } from '@lib/types/layer'
import layerEmitterPlugin, { setLayerEmitter } from '@lib/core/layer-emitter'
import useLiteLayer from '@lib/composables/use-lite-layer'
import useLayerEvent from '@lib/composables/use-layer-event'
import type { LayerInstance } from './types/instance'

// 仅在客户端环境下输出版本信息 / Only output version info in client environment
if (typeof window !== 'undefined') {
  printVersion(import.meta.env.PACKAGE_VERSION)
}

/**
 * Vue 插件安装函数
 * Vue plugin installation function
 *
 * 使用方式：`app.use(VueLiteLayer, globalOptions?)`
 * Usage: `app.use(VueLiteLayer, globalOptions?)`
 *
 * 安装后通过 `inject('layer')` 或 `app.config.globalProperties.$layer` 访问弹层 API。
 * After installation, access layer API via `inject('layer')` or `app.config.globalProperties.$layer`.
 */
LiteLayer.install = (app: App, globalOptions: LayerGlobalConfig) => {
  const $layer = {
    /**
     * 打开一个弹层
     * Open a layer
     *
     * @param options - 弹层配置项（与 globalOptions 合并） / Layer configuration options (merged with globalOptions)
     * @param appContext - 宿主应用上下文，用于共享全局组件、指令等 / Host app context for sharing global components, directives, etc.
     * @returns 弹层实例对象；若打开失败（SSR / 唯一分组冲突）返回 null / Layer instance object; returns null if opening fails (SSR / unique group conflict)
     */
    open: (options?: LayerConfig, appContext?: AppContext): LayerInstance | null => {
      // SSR 环境下不执行 DOM 操作 / Do not perform DOM operations in SSR environment
      if (typeof document === 'undefined') return null

      const id = nanoid()
      const currentOptions: LayerConfig = defu({ id }, options, globalOptions, defaultConfig)

      // 判断唯一分组是否已存在，防止重复打开 / Check if unique group already exists, prevent duplicate opens
      if (layerManager.has(currentOptions.uniqueGroup)) {
        return null
      }

      // 每个弹层实例创建独立的事件总线 / Create independent event bus for each layer instance
      const emitter = mitt()
      setLayerEmitter(emitter)

      // 创建弹层 Vue 应用实例 / Create layer Vue app instance
      const layerApp = createApp(LiteLayer, { ...currentOptions })

      // 共享宿主应用的 appContext（全局组件、指令、provides 等）
      // Share host app's appContext (global components, directives, provides, etc.)
      // 注意：必须在 mount 之前完成，否则 inject 解析会错过上下文。
      // NOTE: This must be done before mount, otherwise inject resolution misses the context.
      if (appContext) {
        const layerContext = (layerApp as any)._context
        layerContext.components = appContext.components
        layerContext.directives = appContext.directives
        layerContext.config = appContext.config
        // Use prototype chain so layer-level provide can shadow host values.
        layerContext.provides = Object.create(appContext.provides || null)
      }

      layerApp.use(layerEmitterPlugin).use(i18n().getI18n(currentOptions.i18n))

      // 向弹层 App 注入 $layer 服务和父容器信息，使嵌套弹层可用
      // Provide $layer service and parent teleport to layer app, enabling nested layers
      layerApp.provide('layer', $layer)
      layerApp.provide('layerParentTeleport', currentOptions.teleport ?? 'body')

      layerApp.mount(document.createElement('div'))

      // 解析 teleport 目标，用于按父容器分组管理 z-index / Parse teleport target for grouping z-index by parent container
      const teleportTarget =
        typeof currentOptions.teleport === 'string' ? currentOptions.teleport : 'body'

      // 弹层关闭后卸载应用实例并清理记录 / Unmount app instance and clean up records after layer closes
      emitter.on('unmount', () => {
        layerApp.unmount()
        layerManager.remove(currentOptions.id!, currentOptions.uniqueGroup, teleportTarget)
      })

      // 构建对外暴露的弹层实例 / Build exposed layer instance
      const instance: LayerInstance = {
        id,
        uniqueGroup: currentOptions.uniqueGroup,
        teleportTarget,
        close: () => {
          emitter.emit('close')
          return true
        },
        bringToTop: () => {
          emitter.emit('top')
        },
        maximize: () => {
          emitter.emit('maximum')
        },
        restore: () => {
          emitter.emit('restore')
        }
      } as LayerInstance

      layerManager.add(instance)
      return instance
    },

    /**
     * 关闭指定弹层
     * Close specified layer
     *
     * @param instance - 要关闭的弹层实例 / Layer instance to close
     * @throws 当 instance 为 null 时抛出异常 / Throws error when instance is null
     */
    close(instance: LayerInstance | null): void {
      if (instance === null) {
        throw new Error('Instance can not be null')
      }
      layerManager.close(instance)
    },

    /**
     * 关闭所有弹层
     * Close all layers
     */
    closeAll(): void {
      layerManager.closeAll()
    }
  }

  // 通过 provide 和 globalProperties 两种方式注入 / Inject via both provide and globalProperties
  app.provide('layer', $layer)
  app.config.globalProperties.$layer = $layer
}

export { useLiteLayer, useLayerEvent }
export default { install: LiteLayer.install }
