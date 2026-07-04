import { type AppContext, getCurrentInstance, inject } from 'vue'
import { LayerServiceKey, type LayerService } from '@lib/core/layer-service'
import type { LayerConfig } from '@lib/types/layer'
import type { LayerInstance } from '@lib/types/instance'

/**
 * 弹层操作 Composable
 * Layer Operation Composable
 *
 * 提供给调用端使用，通过 inject 获取 `$layer` 服务来操控弹层。
 * Provided for caller use, obtains `$layer` service via inject to control layers.
 *
 * ### 嵌套弹层支持 / Nested Layer Support
 *
 * 在弹层内部调用 `openLayer()` 时，若未指定 `teleport`，
 * 会自动继承父弹层的 teleport 目标（在同一容器内打开）。
 * 也可以显式指定 `teleport` 来选择不同的父容器。
 *
 * When calling `openLayer()` inside a layer, if `teleport` is not specified,
 * it automatically inherits the parent layer's teleport target (opens in same container).
 * You can also explicitly specify `teleport` to choose a different parent container.
 *
 * @example
 * ```vue
 * <script setup>
 * const { openLayer, closeLayer, closeAllLayer } = useLiteLayer()
 *
 * // 在宿主应用中打开 / Open from host app
 * openLayer({ title: '标题', content: MyComponent })
 *
 * // 在弹层内部打开（自动继承父容器） / Open from inside a layer (auto-inherits parent container)
 * openLayer({ title: '子弹层', content: ChildComponent })
 *
 * // 在弹层内部打开到指定容器 / Open from inside a layer to specific container
 * openLayer({ title: '子弹层', content: ChildComponent, teleport: '#other-container' })
 * </script>
 * ```
 */
export default () => {
  const $layer = inject(LayerServiceKey) ?? inject<LayerService>('layer')
  const instance = getCurrentInstance()

  /**
   * 父弹层的 teleport 目标（仅在弹层内部可用）
   * Parent layer's teleport target (only available inside a layer)
   *
   * 在宿主应用中为 null；在弹层内部为父弹层的 teleport 值。
   * null in host app; parent layer's teleport value when inside a layer.
   */
  const parentTeleport = inject<LayerConfig['teleport'] | null>('layerParentTeleport', null)

  /**
   * 打开一个弹层
   * Open a layer
   *
   * 在弹层内部调用时，若未指定 teleport，自动继承父弹层的 teleport 目标。
   * When called inside a layer, if teleport is not specified, automatically inherits parent layer's teleport target.
   *
   * @param options - 弹层配置项 / Layer configuration options
   * @param appContext - 宿主应用上下文（用于共享全局组件等） / Host app context (for sharing global components, etc.)
   * @returns 弹层实例对象，可用于后续操控；若打开失败返回 null / Layer instance object for subsequent control; returns null if opening fails
   */
  const openLayer = (options?: LayerConfig, appContext?: AppContext): LayerInstance | null => {
    const finalOptions: LayerConfig = { ...options }

    // 在弹层内部且未显式指定 teleport 时，继承父弹层的容器目标
    // Inside a layer and no explicit teleport specified: inherit parent layer's container target
    if (parentTeleport != null && finalOptions.teleport == null) {
      finalOptions.teleport = parentTeleport
    }

    const effectiveAppContext = appContext ?? instance?.appContext
    return $layer?.open(finalOptions, effectiveAppContext) ?? null
  }

  /**
   * 关闭指定弹层
   * Close specified layer
   *
   * @param instance - 要关闭的弹层实例 / Layer instance to close
   */
  const closeLayer = (instance: LayerInstance): void => {
    $layer?.close(instance)
  }

  /**
   * 关闭所有弹层
   * Close all layers
   */
  const closeAllLayer = (): void => {
    $layer?.closeAll()
  }

  return { openLayer, closeLayer, closeAllLayer }
}
