import mitt from 'mitt'
import { nanoid } from 'nanoid'
import { type App, createApp, type Plugin } from 'vue'
import type { AppContext } from 'vue'
import { defu } from 'defu'
import i18n from '@lib/i18n'
import layerManager from '@lib/core/layer-manager'
import { normalizeTeleportTarget } from '@lib/core/teleport-target'
import printVersion from '@lib/core/banner'
import LiteLayer from '@lib/LiteLayer.vue'
import defaultConfig from '@lib/types/defaults'
import type { LayerConfig, LayerGlobalConfig } from '@lib/types/layer'
import type { LayerEvents } from '@lib/core/layer-events'
import { createLayerEmitterPlugin } from '@lib/core/layer-emitter'
import { LayerServiceKey, type LayerService } from '@lib/core/layer-service'
import useLiteLayer from '@lib/composables/use-lite-layer'
import useLayerEvent from '@lib/composables/use-layer-event'
import type { LayerInstance } from './types/instance'

type AppConfig = AppContext['config']

const cloneGlobalProperties = (
  hostGlobalProperties: AppConfig['globalProperties'],
  layerGlobalProperties: AppConfig['globalProperties']
): AppConfig['globalProperties'] => {
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(hostGlobalProperties),
      ...Object.getOwnPropertyDescriptors(layerGlobalProperties)
    }
  ) as AppConfig['globalProperties']
}

const cloneAppConfigForLayer = (layerConfig: AppConfig, hostConfig: AppConfig): AppConfig => {
  const globalProperties = cloneGlobalProperties(
    hostConfig.globalProperties,
    layerConfig.globalProperties
  )

  return {
    ...layerConfig,
    ...hostConfig,
    globalProperties,
    optionMergeStrategies: {
      ...hostConfig.optionMergeStrategies,
      ...layerConfig.optionMergeStrategies
    },
    compilerOptions: {
      ...hostConfig.compilerOptions,
      ...layerConfig.compilerOptions
    }
  }
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
LiteLayer.install = (app: App, globalOptions?: LayerGlobalConfig) => {
  if (typeof window !== 'undefined' && globalOptions?.banner !== false) {
    printVersion(import.meta.env.PACKAGE_VERSION)
  }

  const $layer: LayerService = {
    /**
     * 打开一个弹层
     * Open a layer
     *
     * @param options - 弹层配置项（与 globalOptions 合并） / Layer configuration options (merged with globalOptions)
     * @param appContext - 宿主应用上下文，用于共享全局组件、指令等 / Host app context for sharing global components, directives, etc.
     * @returns 弹层实例对象；若打开失败（SSR / 唯一分组冲突）返回 null / Layer instance object; returns null if opening fails (SSR / unique group conflict)
     */
    open: (
      options?: LayerConfig,
      appContext?: AppContext,
      sourceProvides?: AppContext['provides']
    ): LayerInstance | null => {
      // SSR 环境下不执行 DOM 操作 / Do not perform DOM operations in SSR environment
      if (typeof document === 'undefined') return null

      const id = nanoid()
      const currentOptions: LayerConfig = defu({ id }, options, globalOptions, defaultConfig)

      // 判断唯一分组是否已存在，防止重复打开 / Check if unique group already exists, prevent duplicate opens
      if (layerManager.has(currentOptions.uniqueGroup)) {
        return null
      }

      // 每个弹层实例创建独立的事件总线 / Create independent event bus for each layer instance
      const emitter = mitt<LayerEvents>()
      const normalizedTeleport = normalizeTeleportTarget(currentOptions.teleport)
      const teleportTarget =
        typeof normalizedTeleport.target === 'string'
          ? normalizedTeleport.target
          : normalizedTeleport.key

      // 创建弹层 Vue 应用实例 / Create layer Vue app instance
      const layerApp = createApp(LiteLayer, {
        ...currentOptions,
        teleport: normalizedTeleport.target,
        teleportKey: normalizedTeleport.key
      })

      // 共享宿主应用的 appContext（全局组件、指令、provides 等）
      // Share host app's appContext (global components, directives, provides, etc.)
      // 注意：必须在 mount 之前完成，否则 inject 解析会错过上下文。
      // NOTE: This must be done before mount, otherwise inject resolution misses the context.
      if (appContext || sourceProvides) {
        const layerContext = layerApp._context
        if (appContext) {
          layerContext.components = appContext.components
          layerContext.directives = appContext.directives
          layerContext.config = cloneAppConfigForLayer(layerContext.config, appContext.config)
        }
        // `appContext.provides` only holds application-level values. When a
        // layer is opened through useLiteLayer(), sourceProvides additionally
        // carries component-tree scoped provides, e.g. ElConfigProvider.
        // Use a prototype chain so layer-level provides can still shadow them.
        layerContext.provides = Object.create(sourceProvides ?? appContext?.provides ?? null)
      }

      layerApp.use(createLayerEmitterPlugin(emitter)).use(i18n().getI18n(currentOptions.i18n))

      // 向弹层 App 注入 $layer 服务和父容器信息，使嵌套弹层可用
      // Provide $layer service and parent teleport to layer app, enabling nested layers
      layerApp.provide(LayerServiceKey, $layer)
      layerApp.provide('layer', $layer)
      layerApp.provide('layerParentTeleport', normalizedTeleport.target)

      // 构建对外暴露的弹层实例 / Build exposed layer instance
      const instance: LayerInstance = {
        id,
        uniqueGroup: currentOptions.uniqueGroup,
        teleportTarget,
        teleportKey: normalizedTeleport.key,
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
      }

      // 弹层关闭后卸载应用实例并清理记录 / Unmount app instance and clean up records after layer closes
      let isUnmounted = false
      emitter.on('unmount', () => {
        if (isUnmounted) return
        isUnmounted = true
        try {
          layerApp.unmount()
        } finally {
          layerManager.remove(
            currentOptions.id!,
            currentOptions.uniqueGroup,
            normalizedTeleport.key
          )
        }
      })

      layerManager.add(instance)

      try {
        layerApp.mount(document.createElement('div'))
      } catch (error) {
        layerManager.remove(currentOptions.id!, currentOptions.uniqueGroup, normalizedTeleport.key)
        throw error
      }

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
  app.provide(LayerServiceKey, $layer)
  app.provide('layer', $layer)
  app.config.globalProperties.$layer = $layer
}

export { useLiteLayer, useLayerEvent }
export type {
  LayerArea,
  LayerConfig,
  LayerContentType,
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
