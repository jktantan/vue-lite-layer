import { PositionPreset, type PixelSize } from '@lib/types/layer'

export interface NumericPosition {
  top: number
  left: number
}

const DEFAULT_GAP = 25

/** Keeps a window's top-left corner inside its available container. */
export const clampPosition = (
  position: NumericPosition,
  windowSize: PixelSize,
  containerSize: PixelSize
): NumericPosition => ({
  top: Math.max(0, Math.min(position.top, containerSize.height - windowSize.height)),
  left: Math.max(0, Math.min(position.left, containerSize.width - windowSize.width))
})

/** Calculates the top-left coordinate for one of the public nine-point presets. */
export const getPresetPosition = (
  preset: PositionPreset,
  windowSize: PixelSize,
  containerSize: PixelSize,
  gap = DEFAULT_GAP
): NumericPosition => {
  const top = {
    start: gap,
    center: containerSize.height / 2 - windowSize.height / 2,
    end: containerSize.height - windowSize.height - gap
  }
  const left = {
    start: gap,
    center: containerSize.width / 2 - windowSize.width / 2,
    end: containerSize.width - windowSize.width - gap
  }

  const positions: Record<PositionPreset, NumericPosition> = {
    [PositionPreset.LEFT_TOP]: { top: top.start, left: left.start },
    [PositionPreset.LEFT_CENTER]: { top: top.center, left: left.start },
    [PositionPreset.LEFT_BOTTOM]: { top: top.end, left: left.start },
    [PositionPreset.CENTER_TOP]: { top: top.start, left: left.center },
    [PositionPreset.CENTER_CENTER]: { top: top.center, left: left.center },
    [PositionPreset.CENTER_BOTTOM]: { top: top.end, left: left.center },
    [PositionPreset.RIGHT_TOP]: { top: top.start, left: left.end },
    [PositionPreset.RIGHT_CENTER]: { top: top.center, left: left.end },
    [PositionPreset.RIGHT_BOTTOM]: { top: top.end, left: left.end }
  }

  // JavaScript callers can pass an arbitrary string; fall back to the default
  // preset instead of returning `undefined` and letting initPosition crash on
  // destructuring.
  return positions[preset] ?? positions[PositionPreset.CENTER_CENTER]
}
