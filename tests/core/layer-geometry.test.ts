import { describe, expect, test } from 'vitest'
import { clampPosition, getPresetPosition } from '@lib/core/layer-geometry'
import { PositionPreset } from '@lib/types/layer'

describe('layer geometry', () => {
  const windowSize = { width: 200, height: 100 }
  const containerSize = { width: 800, height: 600 }

  test('calculates the center preset without reading the DOM', () => {
    expect(getPresetPosition(PositionPreset.CENTER_CENTER, windowSize, containerSize)).toEqual({
      top: 250,
      left: 300
    })
  })

  test('uses the configured gap for corner presets', () => {
    expect(getPresetPosition(PositionPreset.RIGHT_BOTTOM, windowSize, containerSize, 16)).toEqual({
      top: 484,
      left: 584
    })
  })

  test('falls back to the center preset for an unknown runtime value', () => {
    expect(
      getPresetPosition('UNKNOWN' as PositionPreset, windowSize, containerSize)
    ).toEqual({
      top: 250,
      left: 300
    })
  })

  test('clamps positions, including windows larger than their container', () => {
    expect(clampPosition({ top: 900, left: -10 }, windowSize, containerSize)).toEqual({
      top: 500,
      left: 0
    })
    expect(
      clampPosition({ top: 10, left: 10 }, { width: 900, height: 700 }, containerSize)
    ).toEqual({ top: 0, left: 0 })
  })
})
