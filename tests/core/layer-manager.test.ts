import { beforeEach, describe, expect, test, vi } from 'vitest'
import layerManager from '@lib/core/layer-manager'
import type { LayerInstance } from '@lib/types/instance'

const createInstance = (id: string, uniqueGroup?: string, teleportTarget = 'body'): LayerInstance => ({
  id,
  uniqueGroup,
  teleportTarget,
  teleportKey: teleportTarget,
  close: vi.fn(() => true),
  bringToTop: vi.fn(),
  maximize: vi.fn(),
  restore: vi.fn()
})

describe('layerManager', () => {
  beforeEach(() => {
    layerManager.resetForTest()
  })

  test('tracks unique groups while instances are registered', () => {
    layerManager.add(createInstance('a', 'profile'))

    expect(layerManager.has('profile')).toBe(true)

    layerManager.remove('a', 'profile', 'body')

    expect(layerManager.has('profile')).toBe(false)
  })

  test('removes z-index group entries with the same teleport key used for allocation', () => {
    const zIndex = layerManager.allocateZIndex('a', 'element:1')

    expect(zIndex).toBeGreaterThan(1000)
    expect(layerManager.getZIndex('a', 'element:1')).toBe(zIndex)

    layerManager.remove('a', undefined, 'element:1')

    expect(layerManager.getZIndex('a', 'element:1')).toBe(1000)
  })

  test('remove is idempotent for unknown ids and groups', () => {
    expect(() => layerManager.remove('missing', 'group', '#target')).not.toThrow()
  })
})
