import type { LayerInstance } from '@lib/types/instance'

/** 唯一分组集合（防止同组重复打开） / Unique group set (prevent duplicate opens within same group) */
const uniqueGroups = new Set<string>()

/** 所有弹层实例 Map（id → instance） / All layer instances Map (id → instance) */
const instances = new Map<string, LayerInstance>()

/**
 * 按 Teleport 目标（父容器）分组的 z-index 记录
 * z-index records grouped by Teleport target (parent container)
 *
 * key: teleportTarget（如 'body', '#container'）
 * key: teleportTarget (e.g., 'body', '#container')
 * value: Map<instanceId, zIndex>
 */
const zIndexGroups = new Map<string, Map<string, number>>()

/** z-index 基础值，确保弹层始终在页面元素之上 / Base z-index value, ensures layers are always above page elements */
const BASE_Z_INDEX = 1000

/**
 * 全局 z-index 计数器（跨所有分组递增）
 * Global z-index counter (monotonically increasing across all groups)
 *
 * 确保后打开的弹层 z-index 一定高于先前的，无论 teleport 目标是否相同。
 * 解决不同 teleport 分组共享同一 CSS 层叠上下文时的遮挡问题。
 * Ensures later layers always have higher z-index than earlier ones, regardless of teleport target.
 * Fixes occlusion issues when different teleport groups share the same CSS stacking context.
 */
let globalZIndex = BASE_Z_INDEX

/**
 * 弹层管理器 —— 管理所有弹层实例的生命周期与层级
 * Layer Manager — Manages lifecycle and z-index of all layer instances
 *
 * 职责：
 * Responsibilities:
 * - 弹层实例注册 / 移除
 * - Layer instance registration / removal
 * - z-index 分配与置顶
 * - z-index allocation and bring to top
 * - 唯一分组去重
 * - Unique group deduplication
 */
const layerManager = {
  /**
   * 为新弹层分配 z-index（全局最大值 + 1）
   * Allocate z-index for new layer (global max + 1)
   *
   * @param id - 弹层唯一标识 / Layer unique identifier
   * @param teleportTarget - Teleport 目标选择器 / Teleport target selector
   * @returns 分配到的 z-index 值 / Allocated z-index value
   */
  allocateZIndex(id: string, teleportTarget: string): number {
    if (!zIndexGroups.has(teleportTarget)) {
      zIndexGroups.set(teleportTarget, new Map())
    }
    const group = zIndexGroups.get(teleportTarget)!

    const newZIndex = ++globalZIndex
    group.set(id, newZIndex)
    return newZIndex
  },

  /**
   * 将指定弹层置顶（全局最大值 + 1）
   * Bring specified layer to top (global max + 1)
   *
   * @param id - 弹层唯一标识 / Layer unique identifier
   * @param teleportTarget - Teleport 目标选择器 / Teleport target selector
   * @returns 置顶后的 z-index 值 / z-index value after bringing to top
   */
  bringToTop(id: string, teleportTarget: string): number {
    const group = zIndexGroups.get(teleportTarget)
    if (!group) return BASE_Z_INDEX
    const currentZ = group.get(id) ?? BASE_Z_INDEX

    if (currentZ >= globalZIndex) return currentZ
    const newZIndex = ++globalZIndex
    group.set(id, newZIndex)
    return newZIndex
  },

  /**
   * 获取指定弹层当前的 z-index
   * Get current z-index of specified layer
   */
  getZIndex(id: string, teleportTarget: string): number {
    return zIndexGroups.get(teleportTarget)?.get(id) ?? BASE_Z_INDEX
  },

  /**
   * 注册一个新的弹层实例
   * Register a new layer instance
   */
  add(instance: LayerInstance): void {
    if (!instances.has(instance.id)) {
      instances.set(instance.id, instance)
    }
    if (instance.uniqueGroup) {
      uniqueGroups.add(instance.uniqueGroup)
    }
  },

  /**
   * 判断唯一分组是否已存在（防止重复打开）
   * Check if unique group already exists (prevent duplicate opens)
   */
  has(unique: string | null | undefined): boolean {
    return !!(unique && uniqueGroups.has(unique))
  },

  /**
   * 将指定弹层置顶（通过 id 或实例对象）
   * Bring specified layer to top (by id or instance object)
   */
  bringInstanceToTop(id: string | LayerInstance): void {
    const instanceId = typeof id === 'string' ? id : id.id
    const instance = instances.get(instanceId)
    instance?.bringToTop()
  },

  /**
   * 关闭指定弹层
   * Close specified layer
   */
  close(instance: LayerInstance): void {
    instance.close()
  },

  /**
   * 移除弹层记录及其 z-index
   * Remove layer record and its z-index
   *
   * @param id - 弹层标识 / Layer identifier
   * @param unique - 唯一分组标识（可选） / Unique group identifier (optional)
   * @param teleportTarget - Teleport 目标（可选） / Teleport target (optional)
   */
  remove(id: string, unique?: string, teleportTarget?: string): void {
    instances.delete(id)
    if (unique) {
      uniqueGroups.delete(unique)
    }
    if (teleportTarget) {
      const group = zIndexGroups.get(teleportTarget)
      if (group) {
        group.delete(id)
        if (group.size === 0) {
          zIndexGroups.delete(teleportTarget)
        }
      }
    }
  },

  /**
   * 重置测试状态
   * Reset test state
   */
  resetForTest(): void {
    uniqueGroups.clear()
    instances.clear()
    zIndexGroups.clear()
    globalZIndex = BASE_Z_INDEX
  },

  /**
   * 关闭所有弹层
   * Close all layers
   */
  closeAll(): void {
    const snapshot = [...instances.values()]
    for (const instance of snapshot) {
      instance.close()
    }
  }
}

export default layerManager
