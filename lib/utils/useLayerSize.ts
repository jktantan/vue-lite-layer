import { isNil } from 'lodash-es'
import { type Location, LocationType, type Size } from '../model/LayerModel'

export default () => {
  const defaultSize: Size = { height: 0, width: 0 }
  const maximumSize: Size = { height: 0, width: 0 }
  const defaultLocation: Location = { top: '', left: '' }
  const currentLocation: Location = { top: '', left: '' }
  const isLocation = (item: Location | LocationType): item is Location => {
    return !(isNil((item as Location).top) || isNil((item as Location).left))
  }
  const maximum = (moveBox: HTMLElement | undefined) => {
    moveBox!.style.top = '0px'
    moveBox!.style.left = '0px'
    moveBox!.style.width = maximumSize.width + 'px'
    moveBox!.style.height = maximumSize.height + 'px'
  }

  const restore = (moveBox: HTMLElement | undefined, layer: HTMLElement | undefined) => {
    moveBox!.style.top = currentLocation.top
    moveBox!.style.left = currentLocation.left
    moveBox!.style.width = defaultSize.width + 'px'
    moveBox!.style.height = defaultSize.height + 'px'
    if (moveBox!.offsetTop < 0) {
      moveBox!.style.top = '0px'
    }
    if (moveBox!.offsetLeft < 0) {
      moveBox!.style.left = '0px'
    }
    if (moveBox!.offsetTop + moveBox!.offsetHeight > layer!.offsetHeight) {
      moveBox!.style.top = layer!.offsetHeight - moveBox!.offsetHeight + 'px'
    }
    if (moveBox!.offsetLeft + moveBox!.offsetWidth > layer!.offsetWidth) {
      moveBox!.style.left = layer!.offsetWidth - moveBox!.offsetWidth + 'px'
    }
  }
  const initLocation = (location: Location | LocationType, layer: HTMLElement | undefined, moveBox: HTMLElement | undefined) => {
    if (isLocation(location)) {
      moveBox!.style.top = location.top
      moveBox!.style.left = location.left
      if (moveBox!.offsetTop < 0) {
        moveBox!.style.top = '0px'
      }
      if (moveBox!.offsetLeft < 0) {
        moveBox!.style.left = '0px'
      }
      if (moveBox!.offsetTop + moveBox!.offsetHeight > layer!.offsetHeight) {
        moveBox!.style.top = layer!.offsetHeight - moveBox!.offsetHeight + 'px'
      }
      if (moveBox!.offsetLeft + moveBox!.offsetWidth > layer!.offsetWidth) {
        moveBox!.style.left = layer!.offsetWidth - moveBox!.offsetWidth + 'px'
      }
    } else {
      const gap = 25
      const columnCenter = layer!.offsetWidth / 2 - defaultSize.width / 2
      const columnRight = layer!.offsetWidth - defaultSize.width - gap
      const rowCenter = layer!.offsetHeight / 2 - defaultSize.height / 2
      const rowBottom = layer!.offsetHeight - defaultSize.height - gap

      switch (location) {
        case LocationType.LEFT_TOP:
          moveBox!.style.top = gap + 'px'
          moveBox!.style.left = gap + 'px'
          break
        case LocationType.LEFT_CENTER:
          moveBox!.style.top = rowCenter + 'px'
          moveBox!.style.left = gap + 'px'
          break
        case LocationType.LEFT_BOTTOM:
          moveBox!.style.top = rowBottom + 'px'
          moveBox!.style.left = gap + 'px'
          break
        case LocationType.CENTER_TOP:
          moveBox!.style.top = gap + 'px'
          moveBox!.style.left = columnCenter + 'px'
          break
        case LocationType.CENTER_CENTER:
          moveBox!.style.top = rowCenter + 'px'
          moveBox!.style.left = columnCenter + 'px'
          break
        case LocationType.CENTER_BOTTOM:
          moveBox!.style.top = rowBottom + 'px'
          moveBox!.style.left = columnCenter + 'px'
          break
        case LocationType.RIGHT_TOP:
          moveBox!.style.top = gap + 'px'
          moveBox!.style.left = columnRight + 'px'
          break
        case LocationType.RIGHT_CENTER:
          moveBox!.style.top = rowCenter + 'px'
          moveBox!.style.left = columnRight + 'px'
          break
        case LocationType.RIGHT_BOTTOM:
          moveBox!.style.top = rowBottom + 'px'
          moveBox!.style.left = columnRight + 'px'
          break
      }
      defaultLocation.top = moveBox!.style.top
      defaultLocation.left = moveBox!.style.left

      currentLocation.top = moveBox!.style.top
      currentLocation.left = moveBox!.style.left
    }
  }
  const setDefaultSize = (moveBox: HTMLElement | undefined) => {
    Object.assign(defaultSize, {
      height: moveBox!.offsetHeight,
      width: moveBox!.offsetWidth
    })
  }
  const setMaximumSize = (layer: HTMLElement | Element | undefined) => {
    Object.assign(maximumSize, {
      height: layer!.clientHeight,
      width: layer!.clientWidth
    })
    Object.assign(currentLocation, {
      top: layer!.clientTop + 'px',
      left: layer!.clientLeft + 'px'
    })
  }
  const setCurrentLocation = (moveBox: HTMLElement | undefined) => {
    Object.assign(currentLocation, {
      top: moveBox!.offsetTop + 'px',
      left: moveBox!.offsetLeft + 'px'
    })
  }
  return {
    maximum,
    restore,
    setDefaultSize,
    setMaximumSize,
    initLocation,
    setCurrentLocation
  }
}
