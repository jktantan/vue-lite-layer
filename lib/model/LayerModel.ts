import { VueElement, type RendererNode } from 'vue'
import { type Callback } from '@lib/model/CallbackFunction'

/**
 * 可拖拽范围
 */
// export interface DraggableArea {
//   left: number
//   top: number
//   height: number
//   width: number
// }

/**
 * 窗体范围
 */
export interface LayerArea {
  left: string
  top: string
  height: string
  width: string
}

/**
 * 窗体大小
 */
export interface WindowSize {
  height?: string
  width?: string
}
export interface Size {
  height: number
  width: number
}

/**
 * 当前窗体区域
 */
// export interface CurrentArea {
//   top: number
//   left: number
//   height?: number
//   width?: number
// }

/**
 * 位置
 */
export interface Location {
  top: string
  left: string
}

// export interface CurrentLocation {
//   top: number | undefined
//   left: number | undefined
// }

/**
 * 位置类型
 */
export enum LocationType {
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

// export class LayerUtil {
//   instance = new Map()
//   close(id: string) {
//     console.log('max')
//   }
//   closeAll() {
//     console.log('max')
//   }
//   open(): string {
//     return ''
//   }
// }
/**
 * GLOBAL Config
 */
export interface LayerGlobalConfig {
  footer?: NonNullable<unknown> | string | boolean
  shade?: boolean
  shadeClose?: boolean
  maxWidth?: string
  maxHeight?: string
  size?: WindowSize
  location?: Location | LocationType
  teleport?: string | HTMLElement | RendererNode
  max?: boolean
  close?: boolean
  i18n?: { locale?: string; messages?: object }
}

/**
 * config for every Layer
 */
export interface LayerConfig extends LayerGlobalConfig{
  id?: string
  uniqueGroup?: string
  title?: string
  content?: VueElement | HTMLElement | any
  props?: object | null
  onCancel?: Callback | null
  onOk?: Callback | null
  onCommand?: Callback | null
}
