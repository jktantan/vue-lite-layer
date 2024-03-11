import { type ExportInstance } from '@lib/model/ExportInstanceModel'

// const groups = new Map<string, Map<string, ExportInstance>>()
const uniqueGroup = new Set<string>()
// const maxZIndex = 0
const instances = new Map<string, ExportInstance>()
/**
 * 这里是实际提供给外部使用的方法，也同时保存整个应用的所有layer信息
 */
export default {
  /**
   * 增加一个新的layer
   * @param id
   * @param group
   * @param instance
   */
  add: (instance: ExportInstance) => {
    // let instanceMap
    if (!instances.has(instance.id)) {
      instances.set(instance.id, instance)
    }

    if (!instance.uniqueGroup) {
      uniqueGroup.add(instance.uniqueGroup)
    }
  },
  /**
   * 是否需要唯一
   * @param unique
   */
  has: (unique: string|null|undefined): boolean => {
    return !!(unique && uniqueGroup.has(unique));

  },
  /**
   * 设置为最顶
   * @param id
   */
  top: (id: string | ExportInstance) => {
    console.log(id)
  },
  /**
   * 关才卸载当前Layer
   * 这里实际上是直接UNMOUNT
   * @param instance
   */
  close: (instance: ExportInstance) => {
    instance.close()
  },
  remove(id: string, unique?: string) {
    instances.delete(id)
    if (unique) {
      uniqueGroup.delete(unique)
    }
  },
  closeAll() {
    instances.forEach(value => {
      this.close(value)
    })
  }
}
