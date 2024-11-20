import mitt from 'mitt'
import { nanoid } from 'nanoid'
import { type App, createApp } from 'vue'
import type { AppContext } from 'vue'
import { defu } from 'defu'
import i18n from '@lib/i18n'
import LayerOperator from '@lib/utils/LayerOperator'
import banner from '@lib/banner'
import LiteLayer from '@lib/LiteLayer.vue'
import defaultOption from '@lib/model/DefaultOption'
import type { LayerConfig, LayerGlobalConfig } from '@lib/model/LayerModel'
import VueMitter, { setEmitter } from '@lib/utils/layerMitt'
import useLiteLayer from '@lib/utils/useLiteLayer'
import useLayerEvent from '@lib/utils/useLayerEvent'
import type { ExportInstance } from './model/ExportInstanceModel'

banner(import.meta.env.PACKAGE_VERSION)
console.log('install layer')
LiteLayer.install = (app: App, globalOptions: LayerGlobalConfig) => {
  // const mergeGlobalOptions = defu(globalOptions, defaultOption)
  /**
   * 实现composable的实际方法
   */
  const $layer = {
    open: (options?: LayerConfig, appContext?:AppContext): ExportInstance | null => {
      const id = nanoid()
      const currentOptions: LayerConfig = defu(
        {
          id,
        },
        options,
        globalOptions, defaultOption
      )
      // currentOptions.id = id
      // 判断是否可以多开
      if (LayerOperator.has(currentOptions.uniqueGroup!)) {
        return null
      }

      // 需要为每个APP配置一个EventBus
      const emitter = mitt()
      setEmitter(emitter)

      const DynamicLayerApp = createApp(LiteLayer, { ...currentOptions }).use(VueMitter).use(i18n().getI18n(currentOptions.i18n))

      // let DynamicLayerInstance
      // 使当前的appContext和主页面的一样
      if (appContext) {
        // DynamicLayerInstance.$.appContext = appContext!
        // 全局组件
        for (const prop in appContext!.components) {
          if(!DynamicLayerApp.component(prop)) {
            DynamicLayerApp.component(prop, appContext!.components[prop])
          }
        }
        DynamicLayerApp.mount(document.createElement('div')).$.vnode.appContext=appContext!
      }else{
        DynamicLayerApp.mount(document.createElement('div'))
      }
      /**
       * 关闭窗体
       */
      emitter.on('unmount', () => {
        DynamicLayerApp.unmount()
        LayerOperator.remove(currentOptions.id!, currentOptions.uniqueGroup)
      })
      const exportInstance: ExportInstance = {
        id,
        uniqueGroup: currentOptions.uniqueGroup,
        close: () => {
          emitter.emit('close')
        },
        top: () => {
          emitter.emit('top')
        },
        max: () => {
          emitter.emit('maximum')
        },
        restore: () => {
          emitter.emit('restore')
        }
      } as ExportInstance
      LayerOperator.add(exportInstance)

      return exportInstance
    },
    close(instance: ExportInstance | null): void {
      if (instance === null) {
        throw new Error('Instance Can not be NULL')
      } else {
        // instance.close()
        LayerOperator.close(instance)
      }
    },
    closeAll(): void {
      LayerOperator.closeAll()
    }
  }

  app.provide('layer', $layer)
  app.config.globalProperties.$layer = $layer
}
export {useLiteLayer,useLayerEvent}
export default {install:LiteLayer.install}
