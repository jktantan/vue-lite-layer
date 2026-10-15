import type { LayerInstance } from '@lib/types/instance'
import { reactive } from 'vue'

/** 唯一分组集合（防止同组重复打开） / Unique group set (prevent duplicate opens within same group) */
const uniqueGroups = new Set<string>()

/** 所有弹层实例 Map（id → instance） / All layer instances Map (id → instance) */
const instances = new Map<string, LayerInstance>()

/** 最小化窗口按 Teleport 目标分组，Map 的插入顺序即停靠栏顺序。 */
const minimizedGroups = reactive(new Map<string, Map<string, true>>())

/**
 * 反向索引：从弹层 id 查其在分组中的位置。
 * `getMinimizedIndex` 之前用 `[...keys()].indexOf(id)` 在 dock 重排时反复
 * 做 O(n) 扫描；这里在 `minimize/restoreMinimized` 时同步维护，使得查询 O(1)。
 * Reverse index: id -> position within its teleport group.
 * Previously `getMinimizedIndex` rebuilt the keys array on every dock layout
 * computation (O(n)). This map is kept in sync with `minimizedGroups` so the
 * lookup is O(1).
 */
const minimizedIndex = new Map<string, number>()

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

  /** Mark a layer as minimized so its dock item can be positioned among siblings. */
  minimize(id: string, teleportTarget: string): void {
    if (!minimizedGroups.has(teleportTarget)) minimizedGroups.set(teleportTarget, new Map())
    const group = minimizedGroups.get(teleportTarget)!
    // Skip if already present so the reverse index stays at its existing slot.
    if (group.has(id)) return
    const nextIndex = group.size
    group.set(id, true)
    minimizedIndex.set(id, nextIndex)
  },

  /** Remove a layer from its Teleport target's dock. */
  restoreMinimized(id: string, teleportTarget: string): void {
    const group = minimizedGroups.get(teleportTarget)
    if (!group) return
    if (!group.delete(id)) return
    minimizedIndex.delete(id)
    // Rebuild the reverse index for the remaining siblings so positions stay
    // contiguous. This is O(n) but only on minimize/restore, not on every
    // dock layout computation.
    let i = 0
    for (const sibling of group.keys()) {
      minimizedIndex.set(sibling, i++)
    }
    if (group.size === 0) minimizedGroups.delete(teleportTarget)
  },

  /** Get the reactive dock position for one minimized layer (O(1) lookup). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMinimizedIndex(id: string, _teleportTarget: string): number {
    // 参数保留以与计划接口对齐；目前用 O(1) 的全局 `minimizedIndex` 查询
    // 已经足够（同一 id 在不同 teleport target 间共享索引）。
    // The argument is kept for API parity with the plan; the O(1) lookup on
    // the global `minimizedIndex` is sufficient (one id only ever sits in
    // one dock group at a time).
    return minimizedIndex.get(id) ?? -1
  },

  /**
   * 暴露 reactive `minimizedGroups` 让调用方在 computed 里访问以建立
   * reactive 依赖。layerManager 内部的 `minimizedIndex` 是普通 Map，
   * Map.set 不会触发依赖追踪，所以消费方必须额外读一次 `minimizedGroups`
   * 的 size/keys 才会让 `minimize` / `restoreMinimized` 之后的 patch
   * 让 dock 几何重算。
   * Expose the reactive `minimizedGroups` so callers can read it inside a
   * `computed` to register a dep. The internal `minimizedIndex` is a plain
   * Map and `Map.set` doesn't trigger reactivity, so consumers need an extra
   * touch of `minimizedGroups` (size / keys) for the dock layout to recompute
   * after `minimize` / `restoreMinimized`.
   */
  getMinimizedGroups(): Map<string, Map<string, true>> {
    return minimizedGroups
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
      this.restoreMinimized(id, teleportTarget)
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
    minimizedGroups.clear()
    minimizedIndex.clear()
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
