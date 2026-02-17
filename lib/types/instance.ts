/**
 * 弹层实例对外暴露的接口
 * Layer instance exposed interface
 *
 * 每次调用 `$layer.open()` 后返回此对象，
 * Returns this object after each call to `$layer.open()`,
 * 调用方可通过它控制弹层的关闭、置顶、最大化、还原等操作。
 * caller can use it to control layer operations like close, bring to top, maximize, restore, etc.
 */
export interface LayerInstance {
  /** 弹层唯一标识 / Layer unique identifier */
  id: string
  /** 唯一分组标识，同组内只允许打开一个弹层 / Unique group identifier, only one layer allowed per group */
  uniqueGroup: string
  /** Teleport 目标选择器，用于按父容器分组管理 z-index / Teleport target selector for grouping z-index by parent container */
  teleportTarget: string
  /** 关闭弹层 / Close layer */
  close: () => boolean
  /** 将弹层置顶 / Bring layer to top */
  bringToTop: () => void
  /** 最大化弹层 / Maximize layer */
  maximize: () => void
  /** 还原弹层 / Restore layer */
  restore: () => void
}
