import { type AppContext, inject, onMounted } from 'vue'
import { type LayerConfig } from '@lib/model/AreaModel'
import { type ExportInstance } from '@lib/model/ExportInstanceModel'
import LiteLayer from '@lib/LiteLayer.vue'

/**
 * 提供给调用端使用的方法
 * Composable
 *
 */
export default () => {
  // let $layer: any
  let group: string
  const $layer = inject<typeof LiteLayer>('layer')
  onMounted(() => {
    // @ts-ignore
    // const { proxy } = getCurrentInstance()
    // group = nanoid()
    // console.log(group)
    // $layer = proxy.$layer
  })

  /**
   * 打开一个Layer
   * @param options
   */
  const openLayer = (options?: LayerConfig, appContext?: AppContext): ExportInstance | null => {
    console.log(group)
    return $layer!.open(group, options, appContext)
  }

  /**
   * 关闭layer
   * @param instance
   */
  const closeLayer = (instance: ExportInstance): void => {
    $layer!.close(instance)
  }
  /**
   * 关闭所有同一个组的Layer
   * @param group
   */
  const closeAllLayer = (): void => {
    $layer!.closeAll()
  }
  return {
    openLayer,
    closeLayer,
    closeAllLayer
  }
}
