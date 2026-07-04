import type { RendererNode } from 'vue'
import type { LayerConfig } from '@lib/types/layer'

export interface NormalizedTeleportTarget {
  target: NonNullable<LayerConfig['teleport']>
  key: string
  isBody: boolean
}

const elementKeys = new WeakMap<object, string>()
let nextElementId = 0

const isObjectTarget = (target: unknown): target is object => {
  return typeof target === 'object' && target !== null
}

const getElementKey = (target: object): string => {
  const existingKey = elementKeys.get(target)
  if (existingKey) return existingKey

  nextElementId += 1
  const key = `element:${nextElementId}`
  elementKeys.set(target, key)
  return key
}

export const normalizeTeleportTarget = (
  target?: LayerConfig['teleport']
): NormalizedTeleportTarget => {
  if (
    !target ||
    target === 'body' ||
    (typeof document !== 'undefined' && target === document.body)
  ) {
    return { target: 'body', key: 'body', isBody: true }
  }

  if (typeof target === 'string') {
    return { target, key: target, isBody: false }
  }

  if (isObjectTarget(target)) {
    return {
      target: target as HTMLElement | RendererNode,
      key: getElementKey(target),
      isBody: false
    }
  }

  return { target: 'body', key: 'body', isBody: true }
}
