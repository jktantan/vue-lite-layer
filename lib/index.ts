import mitt from 'mitt'
import { nanoid } from 'nanoid'
import { type App, type AppContext, createApp } from 'vue'
import { defu } from 'defu'
import { createI18n } from 'vue-i18n'
import LayerOperator from '@lib/utils/LayerOperator'
import banner from '@lib/banner'
import LiteLayer from '@lib/LiteLayer.vue'
import defaultOption from '@lib/model/DefaultOption'
import type { LayerConfig } from '@lib/model/AreaModel'
import VueMitter, { setEmitter } from '@lib/utils/layerMitt'

// main.ts
import type { ExportInstance } from './model/ExportInstanceModel'
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN', // 首选语言
  fallbackLocale: 'en-US' // 备选语言
})
banner('1.0.0')
console.log('install layer')
LiteLayer.install = (app: App, globalOptions: object) => {
  const mergeGlobalOptions = defu(globalOptions, defaultOption)

  /**
   * 实现composable的实际方法
   */
  const $layer = {
    open: (group: string = 'default', options?: LayerConfig, appContext?: AppContext): ExportInstance | null => {
      const id = nanoid()
      const currentOptions: LayerConfig = defu(
        {
          id,
          group
        },
        options,
        mergeGlobalOptions
      )
      // currentOptions.id = id
      // 判断是否可以多开
      if (LayerOperator.has(group, currentOptions.uniqueGroup!)) {
        return null
      }

      // 需要为每个APP配置一个EventBus
      const emitter = mitt()
      setEmitter(emitter)

      const DynamicLayerApp = createApp(LiteLayer, { ...currentOptions })

      const DynamicLayerInstance = DynamicLayerApp.use(VueMitter).use(i18n).mount(document.createElement('div'))
      // 使当前的appContext和主页面的一样
      if (appContext !== null) {
        DynamicLayerInstance.$.appContext = appContext!
        // 全局组件
        for (const prop in appContext!.components) {
          DynamicLayerApp.component(prop, appContext!.components[prop])
        }
      }
      /**
       * 关闭窗体
       */
      emitter.on('unmount', () => {
        DynamicLayerApp.unmount()
        LayerOperator.remove(currentOptions.id!, currentOptions.group!, currentOptions.uniqueGroup)
      })
      const exportInstance: ExportInstance = {
        id,
        group,
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
    closeAll(group: string): void {
      LayerOperator.closeAll(group)
    }
  }

  app.provide('layer', $layer)
  app.config.globalProperties.$layer = $layer
}
export default {install:LiteLayer.install}
