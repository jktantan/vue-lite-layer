export default () => {
  const DragBind = (dragBox: HTMLElement | undefined, moveBox: HTMLElement | undefined, layer: HTMLElement | undefined, layerSizeUtils: any) => {
    dragBox!.onmousedown = e => {
      if (moveBox?.offsetWidth === layer?.offsetWidth && moveBox?.offsetHeight === layer?.offsetHeight) {
        return
      }
      const disX = e.clientX - moveBox!.offsetLeft
      const disY = e.clientY - moveBox!.offsetTop
      document.onmousemove = e => {
        e.preventDefault()
        const bodyWidth = layer!.offsetWidth
        // that.appendElement !== null
        //   ? that.appendElement.offsetWidth
        //   : document.documentElement.clientWidth
        const bodyHeight = layer!.offsetHeight
        // that.appendElement !== null
        //   ? that.appendElement.offsetHeight
        //   : document.documentElement.clientHeight
        let l = e.clientX - disX
        let t = e.clientY - disY
        const x = bodyWidth - moveBox!.offsetWidth
        const y = bodyHeight - moveBox!.offsetHeight
        l = l < 10 ? 0 : l > x - 10 ? x : l
        t = t < 10 ? 0 : t > y - 10 ? y : t
        moveBox!.style.left = (l < 0 ? 0 : l) + 'px'
        moveBox!.style.top = (t < 0 ? 0 : t) + 'px'
        // currentLocation.value.left = l < 0 ? 0 : l
        // currentLocation.value.top = t < 0 ? 0 : t
        layerSizeUtils.setCurrentLocation(moveBox)
        // return false
      }
      document.onmouseup = () => {
        document.onmousemove = null
        document.onmouseup = null
        return false
      }
      // return false
    }
  }

  return {
    DragBind
  }
}
