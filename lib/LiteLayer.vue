<template>
  <Teleport :to="teleport">
    <div
      ref="layerRef"
      class="lite-layer"
      :style="{
        position: normalizedTeleport.isBody ? 'fixed' : 'absolute',
        'z-index': currentZIndex,
        pointerEvents: shade ? 'auto' : 'none',
        ...layerStyle
      }"
    >
      <div v-if="shade" class="lite-layer__shade" @click="handleShadeClick" />
      <div
        v-if="visible"
        ref="windowRef"
        class="lite-layer__window"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :class="{
          'lite-layer__window--initial': initialHide,
          'lite-layer__window--enter': enterAnim,
          'lite-layer__window--leave': leaveAnim,
          'lite-layer__window--resizing': isResizing
        }"
        :style="{
          maxWidth: maxWidth,
          maxHeight: maxHeight,
          pointerEvents: 'auto',
          ...layerSize.windowStyle
        }"
        @mousedown="handleWindowMouseDown"
        @animationend="handleAnimationEnd"
      >
        <layer-header
          ref="headerRef"
          :title-id="titleId"
          :max="max"
          :close="close"
          :title="title"
        />
        <layer-container
          :content="content"
          :text-content="textContent"
          :content-type="contentType"
          :props="props.props"
        />
        <layer-footer v-if="footer && typeof footer === 'boolean'" />
        <component :is="footer" v-else-if="!!footer" />
        <layer-loading />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ResizeObserver } from '@juggle/resize-observer'
import { reactive, ref, onMounted, onUnmounted, nextTick } from 'vue'
import useDraggable from './composables/use-draggable'

import LayerHeader from '@lib/components/LayerHeader.vue'
import LayerContainer from '@lib/components/LayerContainer.vue'
import LayerFooter from '@lib/components/LayerFooter.vue'
import './assets/style/index.scss'
import { type LayerArea, type LayerConfig, PositionPreset } from './types/layer'
import useLayerSize from './composables/use-layer-size'
import layerManager from './core/layer-manager'
import { normalizeTeleportTarget } from './core/teleport-target'

import { useLayerEmitter } from './core/layer-emitter'
import LayerLoading from './components/LayerLoading.vue'
import type { ResizeObserverEntry } from '@juggle/resize-observer/lib/ResizeObserverEntry'

type InternalLayerConfig = LayerConfig & { teleportKey?: string }

const props = withDefaults(defineProps<InternalLayerConfig>(), {
  title: '',
  footer: true,
  shade: true,
  shadeClose: true,
  maxWidth: 'none',
  maxHeight: 'none',
  size: () => ({
    height: '400px',
    width: '300px'
  }),
  location: PositionPreset.CENTER_CENTER,
  teleport: 'body',
  props: null,
  max: true,
  close: true,
  onCancel: null,
  onOk: null,
  onCommand: null,
  i18n: () => ({ locale: 'zh-CN', messages: {} })
})

// ──── 模板引用 / Template Refs ────
const { bindDrag, unbindDrag } = useDraggable()
const windowRef = ref<HTMLElement>()
const headerRef = ref<any>()
const layerRef = ref<HTMLElement>()

// ──── 状态 / State ────
const visible = ref(true)
const initialHide = ref(true) // 初始隐藏，等定位完成后移除 / Initially hidden, removed after positioning completes
const enterAnim = ref(false)
const leaveAnim = ref(false)
const isMaximized = ref(false)
const isResizing = ref(false)
const titleId = `lite-layer-title-${props.id}`
const LEAVE_ANIMATION_FALLBACK_MS = 220
let closeFallbackTimer: ReturnType<typeof setTimeout> | null = null
let hasUnmounted = false

// ──── z-index 管理 / Z-index Management ────
const normalizedTeleport = normalizeTeleportTarget(props.teleport)
const teleportGroup = props.teleportKey ?? normalizedTeleport.key
const currentZIndex = ref(layerManager.allocateZIndex(props.id!, teleportGroup))

// ──── 弹层尺寸与定位 / Layer Size and Positioning ────
const layerStyle = reactive<LayerArea>({
  top: '0px',
  left: '0px',
  width: '100vw',
  height: '100vh'
})
const emitter = useLayerEmitter()
const layerSize = useLayerSize(props.size)
let resizeObserver: ResizeObserver | null = null

// ──── 事件处理 / Event Handlers ────

const finalizeClose = (): void => {
  if (hasUnmounted) return
  hasUnmounted = true
  if (closeFallbackTimer) {
    clearTimeout(closeFallbackTimer)
    closeFallbackTimer = null
  }
  visible.value = false
  emitter.emit('unmount')
}

const handleClose = () => {
  if (leaveAnim.value || hasUnmounted) return
  leaveAnim.value = true
  enterAnim.value = false
  closeFallbackTimer = setTimeout(finalizeClose, LEAVE_ANIMATION_FALLBACK_MS)
}

const handleAnimationEnd = (e: AnimationEvent) => {
  // 只处理窗口自身的动画事件，忽略子元素冒泡 / Only handle animation events from window itself, ignore bubbling from children
  if (e.target !== windowRef.value) return

  if (leaveAnim.value) {
    finalizeClose()
  } else if (enterAnim.value) {
    // 入场动画完毕，移除 class 释放 CSS 引擎对 animation 的追踪 / Remove class after enter animation to release CSS engine tracking
    enterAnim.value = false
  }
}

const handleShadeClick = () => {
  if (props.shadeClose && props.shade) {
    handleClose()
  }
}

const handleRestore = () => {
  isMaximized.value = false
  isResizing.value = true
  layerSize.restore(windowRef.value, layerRef.value, () => {
    isResizing.value = false
  })
}

const handleMaximize = () => {
  isMaximized.value = true
  isResizing.value = true
  layerSize.maximize(windowRef.value, () => {
    isResizing.value = false
  })
}

const handleBringToTop = () => {
  currentZIndex.value = layerManager.bringToTop(props.id!, teleportGroup)
}

const handleWindowMouseDown = () => {
  handleBringToTop()
}

// ──── 回调事件 / Callback Events ────

const handleAfterOk = (message?: any) => {
  props.onOk?.(message)
}

const handleAfterCancel = (message?: any) => {
  props.onCancel?.(message)
}

const handleAfterCommand = (eventMessage: any) => {
  props.onCommand?.(eventMessage.command, eventMessage.message)
}

const handleContainerResize = (entries: ResizeObserverEntry[]) => {
  if (windowRef.value && entries[0]) {
    layerSize.setMaximumSize(entries[0].target as HTMLElement)
    if (isMaximized.value) {
      // 最大化状态下仅更新最大尺寸并重新铺满，不要覆盖 defaultSize
      // When maximized, only update maximum size and re-fill, DO NOT overwrite defaultSize
      isResizing.value = true
      layerSize.maximize(windowRef.value, () => {
        isResizing.value = false
      })
    }
    // 非最大化时仅更新 maximumSize，不调用 initPosition，否则会覆盖用户拖拽后的位置
    // （ResizeObserver 可能在点击/聚焦等操作时意外触发，导致窗口被重置到中心）
    // When not maximized, only update maximumSize; do NOT call initPosition to avoid
    // overwriting user-dragged position (ResizeObserver may fire spuriously on click/focus)
  }
}

// ──── 生命周期 / Lifecycle ────

onMounted(() => {
  resizeObserver = new ResizeObserver(handleContainerResize)

  if (!normalizedTeleport.isBody) {
    const parent = layerRef.value?.parentElement
    const parentPosition = parent ? window.getComputedStyle(parent).position : 'static'
    const isPositionedParent = ['relative', 'absolute', 'fixed', 'sticky'].includes(parentPosition)

    if (parent && isPositionedParent) {
      Object.assign(layerStyle, { width: '100%', height: '100%' })
    } else if (parent) {
      Object.assign(layerStyle, {
        top: parent.offsetTop + 'px',
        left: parent.offsetLeft + 'px',
        width: '100%',
        height: '100%'
      })
    }
    if (layerRef.value?.parentNode) {
      resizeObserver.observe(layerRef.value.parentNode as Element)
    }
  } else if (layerRef.value) {
    resizeObserver.observe(layerRef.value)
  }

  nextTick(() => {
    layerSize.setDefaultSize(windowRef.value)
    layerSize.setMaximumSize(layerRef.value)
    layerSize.initPosition(props.location, layerRef.value, windowRef.value)
    bindDrag(headerRef.value?.el, windowRef.value, layerRef.value, layerSize)
    // 定位完成后：移除初始隐藏 → 触发入场动画 / After positioning: remove initial hide → trigger enter animation
    requestAnimationFrame(() => {
      initialHide.value = false
      enterAnim.value = true
    })
  })

  emitter.on('maximum', handleMaximize)
  emitter.on('restore', handleRestore)
  emitter.on('close', handleClose)
  emitter.on('top', handleBringToTop)
  emitter.on('afterOk', handleAfterOk)
  emitter.on('afterCancel', handleAfterCancel)
  emitter.on('afterCommand', handleAfterCommand)
})

onUnmounted(() => {
  if (closeFallbackTimer) {
    clearTimeout(closeFallbackTimer)
    closeFallbackTimer = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  unbindDrag()

  emitter.off('maximum', handleMaximize)
  emitter.off('restore', handleRestore)
  emitter.off('close', handleClose)
  emitter.off('top', handleBringToTop)
  emitter.off('afterOk', handleAfterOk)
  emitter.off('afterCancel', handleAfterCancel)
  emitter.off('afterCommand', handleAfterCommand)
})

defineExpose({
  id: props.id,
  close: handleClose,
  bringToTop: handleBringToTop,
  maximize: handleMaximize,
  restore: handleRestore
})
</script>
