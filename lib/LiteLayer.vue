<template>
  <Teleport :to="teleport">
      <div
        ref="layer"
        class="lite-layer"
        :style="{
          position: teleport === 'body' ? 'fixed' : 'absolute',
          'z-index': currentIndex,
          overflow: 'hidden',
          ...layerSizeStyle
        }"
      >
        <div class="lite-layer__shade" />
        <transition name="lite-layer-zoom" appear @after-leave="emitter.emit('unmount')">
          <div
            v-if="show"
            ref="moveBox"
            class="lite-layer__window"
            :style="{
              maxWidth: maxWidth,
              maxHeight: maxHeight,
              ...size
            }"
          >
            <layer-header ref="dragBox" :max="max" :close="close" :title="title" />
            <!--          <suspense v-if="canShowContainer">-->
            <layer-container ref="container" :content="content" :props="props.props" />
            <!--          </suspense>-->
            <layer-footer v-if="footer && typeof footer === 'boolean'" />
            <component :is="footer" v-if="!!footer && typeof footer !== 'boolean'" />
            <layer-loading />
          </div>
        </transition>
      </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ResizeObserver } from '@juggle/resize-observer'
import { computed, reactive, provide, ref, onMounted, nextTick } from 'vue'
import useDraggable from './utils/useDraggable'

import LayerHeader from '@lib/components/LayerHeader.vue'
import LayerContainer from '@lib/components/LayerContainer.vue'
import LayerFooter from '@lib/components/LayerFooter.vue'
import './assets/style/index.scss'
import  { type LayerArea, type LayerConfig, LocationType } from './model/AreaModel'
import LayerSizeUtils from './utils/useLayerSize'

import { useEmitter } from './utils/layerMitt'
import LayerLoading from './components/LayerLoading.vue'
import { ResizeObserverEntry } from '@juggle/resize-observer/lib/ResizeObserverEntry'

const props = withDefaults(defineProps<LayerConfig>(), {
  title: '',
  footer: true,
  shade: true,
  shadeClose: true,
  maxWidth: 'none',
  maxHeight: 'none',
  size: () => {
    return {
      height: '400px',
      width: '300px'
    }
  },
  location: LocationType.CENTER_CENTER,
  teleport: 'body',
  props: null,
  max: true,
  close: true,
  onCancel: null,
  onOk: null,
  onCommand: null,
  i18n: () => ({ locale: 'zh-CN', messages: {} })
})
provide('locales', { ...props.i18n })

const { DragBind } = useDraggable()
const moveBox = ref<HTMLElement>()
const dragBox = ref<any>()
const container = ref<any>()
const show = ref<boolean>(true)
// 是否最大化
const isMax = ref<boolean>(false)
const currentIndex = computed<number>(() => {
  return 10
})
const layerSizeStyle = reactive<LayerArea>({
  top: '0px',
  left: '0px',
  width: '100vw',
  height: '100vh'
})
const layer = ref<HTMLElement>()
const emitter = useEmitter()
const useLayerSize = LayerSizeUtils()

const onClose = () => {
  show.value = false
}

// 窗体恢复
const onRestore = () => {
  isMax.value = false
  useLayerSize.restore(moveBox.value, layer.value)
}
// 窗体最大化
const onMaximum = () => {
  isMax.value = true
  useLayerSize.maximum(moveBox.value)
}

emitter.on('afterOk', (message?: any) => {
  if (props.onOk !== null) {
    props.onOk!(message)
  }
})
emitter.on('afterCancel', (message?: any) => {
  if (props.onCancel !== null) {
    props.onCancel!(message)
  }
})
emitter.on('afterCommand', (eventMessage: any) => {
  if (props.onCommand !== null) {
    props.onCommand!(eventMessage.command, eventMessage.message)
  }
})

const resizeUpdate = new ResizeObserver((entries:ResizeObserverEntry[]) => {
  if (moveBox.value!) {
    useLayerSize.setMaximumSize(entries[0].target as HTMLElement)
    useLayerSize.setDefaultSize(moveBox.value)
    if (!isMax.value) {
      // 重定位
      useLayerSize.initLocation(props.location, entries[0].target as HTMLElement, moveBox.value)
    } else {
      useLayerSize.maximum(moveBox.value)
    }
  }
})
// 初始化数据
onMounted(() => {
  if (props.teleport !== 'body') {
    if (layer.value?.parentElement!.style.position === 'relative') {
      Object.assign(layerSizeStyle, {
        width: '100%',
        height: '100%'
      })
    } else {
      Object.assign(layerSizeStyle, {
        top: layer.value?.parentElement!.offsetTop + 'px',
        left: layer.value?.parentElement!.offsetLeft + 'px',
        width: '100%',
        height: '100%'
        // height: layer.value?.parentElement!.offsetHeight + 'px'
      })
    }
    resizeUpdate.observe(layer.value?.parentNode as Element)
  } else {
    resizeUpdate.observe(layer.value as Element)
  }

  // nextTick().then(() => {
  // console.log(layer.value?.parentNode!.style)
  // Object.assign(layerSizeStyle, {
  //   width: layer.value?.parentNode!.offsetWidth + 'px',
  //   height: layer.value?.parentNode!.offsetHeight + 'px',
  // })
  nextTick(() => {
    // 下面数据不在nextTick里面，数值会出错
    useLayerSize.setDefaultSize(moveBox.value)
    useLayerSize.setMaximumSize(layer.value)
    useLayerSize.initLocation(props.location, layer.value, moveBox.value)
    DragBind(dragBox.value.el, moveBox.value, layer.value, useLayerSize)
  })

  emitter.on('maximum', () => {
    onMaximum()
  })
  emitter.on('restore', () => {
    onRestore()
  })
  emitter.on('close', () => {
    onClose()
  })
  // })
})

defineExpose({
  id: props.id,
  close: onClose,
  top,
  max: onMaximum,
  restore: onRestore
})
</script>

<style scoped></style>
