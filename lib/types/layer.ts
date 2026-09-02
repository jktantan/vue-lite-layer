import type { Component, RendererNode } from 'vue'
import type { LayerCallback } from './callback'
import type { LocaleMessages } from '@lib/i18n'

/**
 * 弹层遮罩区域样式
 * Layer mask area style
 */
export interface LayerArea {
  left: string
  top: string
  height: string
  width: string
}

/**
 * 弹层窗口尺寸（CSS 字符串值）
 * Layer window size (CSS string value)
 */
export interface WindowSize {
  height?: string
  width?: string
}

/**
 * 弹层尺寸（像素数值）
 * Layer size (pixel numeric value)
 */
export interface PixelSize {
  height: number
  width: number
}

/**
 * 弹层绝对定位坐标
 * Layer absolute positioning coordinates
 */
export interface Position {
  top: string
  left: string
}

/**
 * 预设定位方式
 * Preset positioning method
 *
 * 格式：`列_行`，例如 `CC` = 水平居中 + 垂直居中
 * Format: `column_row`, e.g., `CC` = horizontal center + vertical center
 */
export enum PositionPreset {
  LEFT_TOP = 'LT',
  LEFT_CENTER = 'LC',
  LEFT_BOTTOM = 'LB',
  CENTER_TOP = 'CT',
  CENTER_CENTER = 'CC',
  CENTER_BOTTOM = 'CB',
  RIGHT_TOP = 'RT',
  RIGHT_CENTER = 'RC',
  RIGHT_BOTTOM = 'RB'
}

export type LayerContentType = 'html' | 'text'

export type LayerCloseReason = 'programmatic' | 'header' | 'shade' | 'escape' | 'cancel' | 'ok'

export interface LayerCloseContext {
  reason: LayerCloseReason
}

export interface LayerCloseResult extends LayerCloseContext {
  action: 'close' | 'ok' | 'cancel'
  data?: unknown
}

export type LayerBeforeClose = (context: LayerCloseContext) => boolean | void | Promise<boolean | void>
export type LayerLifecycleCallback = (context?: LayerCloseContext) => void

/** 异步内容的加载/失败展示配置 / Async content loading and failure presentation */
export interface AsyncContentConfig {
  loadingText?: string
  errorText?: string
  retryText?: string
  onError?: (error: unknown) => void
}

/**
 * 全局配置（通过 `app.use(VueLiteLayer, globalConfig)` 传入）
 * Global configuration (passed via `app.use(VueLiteLayer, globalConfig)`)
 *
 * 这些选项将作为所有弹层的默认值，可被单个弹层配置覆盖。
 * These options will serve as defaults for all layers and can be overridden by individual layer configurations.
 */
export interface LayerGlobalConfig {
  /** 底部按钮区：true=默认按钮 | false=隐藏 | string/Component=自定义内容 / Footer button area: true=default buttons | false=hidden | string/Component=custom content */
  footer?: boolean | string | Component
  /** 是否显示遮罩 / Whether to show mask */
  shade?: boolean
  /** 点击遮罩是否关闭弹层 / Whether clicking mask closes layer */
  shadeClose?: boolean
  /** 弹层最大宽度（CSS 值） / Layer maximum width (CSS value) */
  maxWidth?: string
  /** 弹层最大高度（CSS 值） / Layer maximum height (CSS value) */
  maxHeight?: string
  /** 弹层默认尺寸 / Layer default size */
  size?: WindowSize
  /** 弹层定位方式：预设枚举或自定义坐标 / Layer positioning method: preset enum or custom coordinates */
  location?: Position | PositionPreset
  /** Teleport 目标：CSS 选择器字符串或 DOM 元素 / Teleport target: CSS selector string or DOM element */
  teleport?: string | HTMLElement | RendererNode
  /** 是否允许最大化 / Whether maximization is allowed */
  max?: boolean
  /** 是否显示关闭按钮 / Whether to show close button */
  close?: boolean
  /** 点击确认后是否默认关闭 / Whether Confirm closes by default */
  closeOnOk?: boolean
  /** 按 Escape 是否请求关闭 / Whether Escape requests closing */
  closeOnEsc?: boolean
  /** 是否将 Tab 焦点限制在弹层内 / Whether to trap Tab focus in the layer */
  trapFocus?: boolean
  /** 关闭后是否恢复打开前的焦点 / Whether to restore focus after closing */
  restoreFocus?: boolean
  /** 是否输出版本 banner；默认 true / Whether to print version banner; defaults to true */
  banner?: boolean
  /** 国际化配置 / Internationalization configuration */
  i18n?: { locale?: string; messages?: LocaleMessages }
  /** 异步内容加载及失败状态配置 / Async content state configuration */
  asyncContent?: AsyncContentConfig
}

/**
 * 单个弹层配置（通过 `$layer.open(config)` 传入）
 * Single layer configuration (passed via `$layer.open(config)`)
 *
 * 继承全局配置的所有选项，并增加弹层专属属性。
 * Inherits all options from global configuration and adds layer-specific properties.
 */
export interface LayerConfig extends LayerGlobalConfig {
  /** 弹层唯一标识（自动生成，一般无需手动指定） / Layer unique identifier (auto-generated, usually no need to specify manually) */
  id?: string
  /** 唯一分组标识，同组内只允许打开一个弹层 / Unique group identifier, only one layer allowed per group */
  uniqueGroup?: string
  /** 弹层标题 / Layer title */
  title?: string
  /** 弹层内容：Vue 组件、HTML 元素或 trusted HTML 字符串 / Layer content: Vue component, HTMLElement, or trusted HTML string */
  content?: Component | HTMLElement | string
  /** 安全文本内容；按纯文本渲染，优先级高于 content / Safe text content rendered as plain text, takes precedence over content */
  textContent?: string
  /** 字符串 content 的渲染模式；默认 html 以兼容历史行为 / Render mode for string content; defaults to html for compatibility */
  contentType?: LayerContentType
  /** 传递给内容组件的 props / Props passed to content component */
  props?: object | null
  /** 取消回调 / Cancel callback */
  onCancel?: LayerCallback | null
  /** 确认回调 / Confirm callback */
  onOk?: LayerCallback | null
  /** 自定义命令回调 / Custom command callback */
  onCommand?: LayerCallback | null
  /** 关闭前拦截器；返回 false 可阻止关闭 / Close guard */
  beforeClose?: LayerBeforeClose | null
  /** 生命周期回调 / Lifecycle callbacks */
  onOpen?: LayerLifecycleCallback | null
  onOpened?: LayerLifecycleCallback | null
  onClose?: LayerLifecycleCallback | null
  onClosed?: LayerLifecycleCallback | null
}
