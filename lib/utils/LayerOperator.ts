import { type ExportInstance } from '@lib/model/ExportInstanceModel'

// const groups = new Map<string, Map<string, ExportInstance>>()
const uniqueGroup = new Map<string, Set<string>>()
// const maxZIndex = 0
const instances = new Map<string, Map<string, ExportInstance>>()
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
    let instanceMap
    if (!instances.has(instance.group)) {
      instanceMap = new Map<string, ExportInstance>()
      instances.set(instance.group, instanceMap)
    }
    instanceMap = instances.get(instance.group)
    instanceMap!.set(instance.id, instance)

    if (instance.uniqueGroup !== null && instance.uniqueGroup !== '') {
      let uniqueGroupSet
      if (!uniqueGroup.has(instance.group)) {
        uniqueGroupSet = new Set<string>()
        uniqueGroup.set(instance.group, uniqueGroupSet)
      }
      uniqueGroupSet = uniqueGroup.get(instance.group)
      uniqueGroupSet!.add(instance.uniqueGroup)
    }
  },
  /**
   * 是否需要唯一
   * @param group
   */
  has: (group: string, unique: string): boolean => {
    if (uniqueGroup.has(group)) {
      const uniqueSet = uniqueGroup.get(group)
      if (uniqueSet!.has(unique)) {
        return true
      }
    }
    return false
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
   * @param id
   * @param group
   */
  close: (instance: ExportInstance) => {
    instance.close()
    // instances.delete(instance.id)
    // uniqueGroup.delete(instance.uniqueGroup)
  },
  remove(id: string, group: string, unique?: string) {
    instances.get(group)?.delete(id)
    if (unique !== undefined) {
      uniqueGroup.get(group)?.delete(unique)
    }
  },
  closeAll(group: string) {
    instances.get(group)!.forEach((value) => {
      this.close(value)
    })
  }
}
