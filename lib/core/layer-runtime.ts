import mitt from 'mitt'
import { nanoid } from 'nanoid'
import { defu } from 'defu'
import { createApp, defineComponent, h, shallowReactive, type AppContext } from 'vue'
import i18n from '@lib/i18n'
import LiteLayer from '@lib/LiteLayer.vue'
import useLayerEvent from '@lib/composables/use-layer-event'
import useLiteLayer from '@lib/composables/use-lite-layer'
import { createLayerEmitterPlugin } from '@lib/core/layer-emitter'
import type { LayerEvents } from '@lib/core/layer-events'
import layerManager from '@lib/core/layer-manager'
import { LayerServiceKey, type LayerService } from '@lib/core/layer-service'
import { normalizeTeleportTarget } from '@lib/core/teleport-target'
import defaultConfig from '@lib/types/defaults'
import type { LayerCloseResult, LayerConfig, LayerGlobalConfig } from '@lib/types/layer'
import type { LayerInstance } from '@lib/types/instance'

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

/**
 * Reads `config.compilerOptions` without tripping Vue's runtime-only warning.
 *
 * In a runtime-only build Vue redefines `app.config.compilerOptions` as an
 * accessor whose *getter* also warns (see Vue's `injectCompilerOptionsCheck`).
 * Plain property access would therefore log a warning on every layer open.
 * Inspecting the own property descriptor avoids invoking the getter: a real
 * data property (full build, where the option is meaningful) exposes `value`,
 * while the runtime-only accessor does not — and then there is nothing to copy.
 */
const readCompilerOptions = (config: AppConfig): AppConfig['compilerOptions'] | undefined => {
  const descriptor = Object.getOwnPropertyDescriptor(config, 'compilerOptions')
  return descriptor && 'value' in descriptor
    ? (descriptor.value as AppConfig['compilerOptions'])
    : undefined
}

/**
 * Shallow-copies an app config's own enumerable fields while skipping
 * `compilerOptions`.
 *
 * `{ ...config }` is unsafe here: the object-literal `compilerOptions` property
 * stays enumerable when Vue swaps in the warning accessor, so spreading the
 * config still reads it (getter included) and logs Vue's runtime-only warning
 * on every layer open. `Object.keys` yields only key names — no getter call —
 * so the key can be dropped and its value copied deliberately via
 * {@link readCompilerOptions}.
 */
const copyConfigWithoutCompilerOptions = (config: AppConfig): Partial<AppConfig> => {
  const copy: Record<string, unknown> = {}
  const source = config as unknown as Record<string, unknown>
  for (const key of Object.keys(config)) {
    if (key === 'compilerOptions') continue
    copy[key] = source[key]
  }
  return copy as unknown as Partial<AppConfig>
}

const cloneAppConfigForLayer = (layerConfig: AppConfig, hostConfig: AppConfig): AppConfig => {
  return {
    ...copyConfigWithoutCompilerOptions(layerConfig),
    ...copyConfigWithoutCompilerOptions(hostConfig),
    globalProperties: cloneGlobalProperties(hostConfig.globalProperties, layerConfig.globalProperties),
    optionMergeStrategies: {
      ...hostConfig.optionMergeStrategies,
      ...layerConfig.optionMergeStrategies
    },
    compilerOptions: {
      ...readCompilerOptions(layerConfig),
      ...readCompilerOptions(hostConfig)
    }
  } as AppConfig
}

/**
 * Vue does not mark an app as mounted when an error aborts its initial render,
 * even if Teleport has already inserted DOM into its target. This is the
 * narrow fallback for that state; normal close paths always use app.unmount().
 */
const removeFailedTeleportRoot = (
  target: ReturnType<typeof normalizeTeleportTarget>['target'],
  id: string
): void => {
  const root =
    target === 'body'
      ? document.body
      : typeof target === 'string'
        ? document.querySelector(target)
        : target instanceof Element
          ? target
          : null
  if (!root) return

  for (const element of root.querySelectorAll<HTMLElement>('.lite-layer[data-layer-id]')) {
    if (element.dataset.layerId === id) {
      element.remove()
      return
    }
  }
}

/** Creates the isolated Vue application and public instance for one layer. */
const openLayer = (
  service: LayerService,
  globalOptions: LayerGlobalConfig | undefined,
  options?: LayerConfig,
  appContext?: AppContext,
  sourceProvides?: AppContext['provides']
): LayerInstance | null => {
  if (typeof document === 'undefined') return null

  const id = nanoid()
  const currentOptions: LayerConfig = defu({ id }, options, globalOptions, defaultConfig)
  if (layerManager.has(currentOptions.uniqueGroup)) return null

  const emitter = mitt<LayerEvents>()
  const normalizedTeleport = normalizeTeleportTarget(currentOptions.teleport)
  // `teleportTarget` is the public-facing identifier (CSS selector or the
  // canonical "body" string). HTMLElement targets are not representable as a
  // string, so the field falls back to empty rather than leaking the internal
  // "element:N" key generated by normalizeTeleportTarget. Consumers that need
  // a stable handle for bookkeeping should use `teleportKey`.
  // `?? ''` narrows the union to `string` so it satisfies LayerInstance.teleportTarget.
  const teleportTarget: string =
    typeof normalizedTeleport.target === 'string' ? normalizedTeleport.target : ''
  const runtimeOptions = shallowReactive({
    ...currentOptions,
    teleport: normalizedTeleport.target,
    teleportKey: normalizedTeleport.key
  })
  const LayerRoot = defineComponent({
    name: 'VueLiteLayerRoot',
    setup: () => () => h(LiteLayer, runtimeOptions)
  })
  const layerApp = createApp(LayerRoot)

  if (appContext || sourceProvides) {
    const layerContext = layerApp._context
    if (appContext) {
      layerContext.components = appContext.components
      layerContext.directives = appContext.directives
      layerContext.config = cloneAppConfigForLayer(layerContext.config, appContext.config)
    }
    // Component-scoped provides take precedence over app-level values while
    // preserving the layer app's own ability to shadow both.
    layerContext.provides = Object.create(sourceProvides ?? appContext?.provides ?? null)
  }

  layerApp.use(createLayerEmitterPlugin(emitter)).use(i18n().getI18n(currentOptions.i18n))
  // Assign the service keys directly instead of calling `layerApp.provide()`.
  // The layer app inherits the host's provides through the prototype chain (set
  // above), and the host already provides these same keys — `app.provide()`
  // would log a dev warning ("...inherited from its parent element") even
  // though the value is identical. A plain assignment creates an own property
  // that shadows the inherited one, with no warning.
  layerApp._context.provides[LayerServiceKey] = service
  layerApp._context.provides['layer'] = service
  layerApp.provide('layerParentTeleport', normalizedTeleport.target)

  let resolveClosed!: (result: LayerCloseResult) => void
  const closed = new Promise<LayerCloseResult>((resolve) => {
    resolveClosed = resolve
  })
  let closeResult: LayerCloseResult = { reason: 'programmatic', action: 'close' }
  emitter.on('ok', (data) => {
    closeResult = { ...closeResult, action: 'ok', data }
  })
  emitter.on('cancel', (data) => {
    closeResult = { ...closeResult, action: 'cancel', data }
  })
  emitter.on('afterOk', (data) => {
    closeResult = { ...closeResult, action: 'ok', data }
  })
  emitter.on('afterCancel', (data) => {
    closeResult = { ...closeResult, action: 'cancel', data }
  })
  emitter.on('closed', (context) => {
    closeResult = { ...closeResult, reason: context.reason }
  })

  const instance: LayerInstance = {
    id,
    uniqueGroup: currentOptions.uniqueGroup,
    teleportTarget,
    teleportKey: normalizedTeleport.key,
    close: () => {
      emitter.emit('requestClose', { reason: 'programmatic' })
    },
    bringToTop: () => emitter.emit('top'),
    maximize: () => emitter.emit('maximum'),
    minimize: () => emitter.emit('minimize'),
    restore: () => emitter.emit('restore'),
    update: (nextOptions) => {
      // Identity and teleport are immutable because manager bookkeeping uses them.
      const { id: _id, uniqueGroup: _uniqueGroup, teleport: _teleport, ...mutableOptions } =
        nextOptions as LayerConfig
      Object.assign(runtimeOptions, mutableOptions)
    },
    closed
  }

  let isUnmounted = false
  emitter.on('unmount', () => {
    if (isUnmounted) return
    isUnmounted = true
    try {
      layerApp.unmount()
    } finally {
      resolveClosed(closeResult)
      layerManager.remove(id, currentOptions.uniqueGroup, normalizedTeleport.key)
    }
  })

  layerManager.add(instance)
  try {
    layerApp.mount(document.createElement('div'))
  } catch (error) {
    // A failure can happen after Vue has created Teleport nodes. Remove the
    // isolated app first so DOM/listeners are released, then always release
    // manager bookkeeping before propagating the original mount error.
    try {
      if (layerApp._instance?.isMounted) {
        layerApp.unmount()
      } else {
        removeFailedTeleportRoot(normalizedTeleport.target, id)
      }
    } catch (cleanupError) {
      console.error('[vue-lite-layer] failed to clean up a layer after mount failure', cleanupError)
    } finally {
      layerManager.remove(id, currentOptions.uniqueGroup, normalizedTeleport.key)
    }
    throw error
  }

  return instance
}

/** Creates the per-host service exposed as `$layer` and through injection. */
export const createLayerService = (globalOptions?: LayerGlobalConfig): LayerService => {
  const service: LayerService = {
    open: (options, appContext, sourceProvides) =>
      openLayer(service, globalOptions, options, appContext, sourceProvides),
    close: (instance) => {
      if (instance === null) throw new Error('Instance can not be null')
      layerManager.close(instance)
    },
    closeAll: () => layerManager.closeAll()
  }
  return service
}

export { useLiteLayer, useLayerEvent }
