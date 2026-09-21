<template>
  <Teleport :to="teleport">
    <div
      ref="layerRef"
      class="lite-layer"
      :data-layer-id="id"
      :style="{
        position: isTeleportToBody ? 'fixed' : 'absolute',
        'z-index': currentZIndex,
        pointerEvents: shade ? 'auto' : 'none',
        ...layerStyle
      }"
    >
      <div
        v-if="shade"
        class="lite-layer__shade"
        role="button"
        aria-label="Close layer"
        tabindex="-1"
        @click="handleShadeClick"
      />
      <div
        v-if="visible"
        ref="windowRef"
        class="lite-layer__window"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
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
        @keydown="handleKeydown"
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
          :async-content="asyncContent"
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
import {
  reactive,
  ref,
  useTemplateRef,
  onMounted,
  onUnmounted,
  nextTick,
  watch,
  type ComponentPublicInstance
} from 'vue'
import useDraggable from './composables/use-draggable'

import LayerHeader from '@lib/components/LayerHeader.vue'
import LayerContainer from '@lib/components/LayerContainer.vue'
import LayerFooter from '@lib/components/LayerFooter.vue'
import './assets/style/index.scss'
import { type LayerArea, type LayerConfig, PositionPreset } from './types/layer'
import useLayerSize from './composables/use-layer-size'
import { useLayerClose } from './composables/use-layer-close'
import { useLayerFocus } from './composables/use-layer-focus'
import layerManager from './core/layer-manager'
import { lockBodyScroll, unlockBodyScroll } from './core/scroll-lock'

import { useLayerEmitter } from './core/layer-emitter'
import type { LayerCommandPayload } from './core/layer-events'
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
  closeOnOk: false,
  onCancel: null,
  onOk: null,
  onCommand: null,
  beforeClose: null,
  onOpen: null,
  onOpened: null,
  onClose: null,
  onClosed: null,
  i18n: () => ({ locale: 'zh-CN', messages: {} })
})

// ──── 模板引用 / Template Refs ────
const { bindDrag, unbindDrag } = useDraggable()
const windowRef = useTemplateRef<HTMLElement>('windowRef')
const headerRef = useTemplateRef<ComponentPublicInstance<{ el: HTMLElement }>>('headerRef')
const layerRef = useTemplateRef<HTMLElement>('layerRef')

// ──── 状态 / State ────
const initialHide = ref(true) // 初始隐藏，等定位完成后移除 / Initially hidden, removed after positioning completes
const enterAnim = ref(false)
const isMaximized = ref(false)
const isResizing = ref(false)
const titleId = `lite-layer-title-${props.id}`
const ENTER_ANIMATION_FALLBACK_MS = 220
let enterFallbackTimer: ReturnType<typeof setTimeout> | null = null
let hasOpened = false
let hasScrollLock = false

// ──── z-index 管理 / Z-index Management ────
const isTeleportToBody =
  props.teleport === 'body' ||
  (typeof document !== 'undefined' && props.teleport === document.body)
const teleportGroup = props.teleportKey ?? (typeof props.teleport === 'string' ? props.teleport : 'body')
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
const closeState = useLayerClose(props, emitter, () => {
  enterAnim.value = false
})
const { visible, leaveAnim, isUnmounted, requestClose, finalizeClose } = closeState
const { capturePreviousFocus, focusWindow, handleKeydown, restorePreviousFocus } = useLayerFocus({
  getWindow: () => windowRef.value,
  shouldCloseOnEsc: () => props.closeOnEsc,
  shouldTrapFocus: () => props.trapFocus,
  shouldRestoreFocus: () => props.restoreFocus,
  requestClose
})

// ──── 事件处理 / Event Handlers ────

const finalizeOpen = (): void => {
  if (hasOpened || isUnmounted.value || leaveAnim.value) return
  hasOpened = true
  if (enterFallbackTimer) {
    clearTimeout(enterFallbackTimer)
    enterFallbackTimer = null
  }
  enterAnim.value = false
  props.onOpened?.()
}

// Keep the internal `close` emitter event working for integrations built
// against earlier versions, while routing it through the new close guard.
const handleLegacyClose = (): void => {
  void requestClose({ reason: 'programmatic' })
}

const handleAnimationEnd = (e: AnimationEvent) => {
  // 只处理窗口自身的动画事件，忽略子元素冒泡 / Only handle animation events from window itself, ignore bubbling from children
  if (e.target !== windowRef.value) return

  if (leaveAnim.value) {
    finalizeClose()
  } else if (enterAnim.value) {
    finalizeOpen()
  }
}

const handleShadeClick = () => {
  if (props.shadeClose && props.shade) {
    void requestClose({ reason: 'shade' })
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

const handleAfterOk = (message?: unknown): void => {
  props.onOk?.(message)
}

const handleAfterCancel = (message?: unknown): void => {
  props.onCancel?.(message)
}

const handleAfterCommand = (eventMessage: LayerCommandPayload): void => {
  props.onCommand?.(eventMessage.command, eventMessage.message)
}

const syncScrollLock = (): void => {
  const shouldLock = isTeleportToBody && props.shade
  if (shouldLock && !hasScrollLock) {
    lockBodyScroll()
    hasScrollLock = true
  } else if (!shouldLock && hasScrollLock) {
    unlockBodyScroll()
    hasScrollLock = false
  }
}

const handleOk = (): void => {
  if (props.closeOnOk) {
    void requestClose({ reason: 'ok' })
  }
}

const handleContainerResize = (entries: ResizeObserverEntry[]) => {
  if (windowRef.value && entries[0]) {
    layerSize.setMaximumSize(entries[0].target as HTMLElement)
    if (isMaximized.value) {
      // 最大化状态下仅更新最大尺寸并重新铺满，不要覆盖 defaultSize
      // When maximized, only update maximum size and re-fill, DO NOT overwrite defaultSize
      isResizing.value = true
      layerSize.maximize(
        windowRef.value,
        () => {
          isResizing.value = false
        },
        { animated: false }
      )
    }
    // 非最大化时仅更新 maximumSize，不调用 initPosition，否则会覆盖用户拖拽后的位置
    // （ResizeObserver 可能在点击/聚焦等操作时意外触发，导致窗口被重置到中心）
    // When not maximized, only update maximumSize; do NOT call initPosition to avoid
    // overwriting user-dragged position (ResizeObserver may fire spuriously on click/focus)
  }
}

// ──── 生命周期 / Lifecycle ────

onMounted(() => {
  capturePreviousFocus()
  props.onOpen?.()
  resizeObserver = new ResizeObserver(handleContainerResize)
  syncScrollLock()

  if (!isTeleportToBody) {
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
    focusWindow()
    // 定位完成后：移除初始隐藏 → 触发入场动画 / After positioning: remove initial hide → trigger enter animation
    requestAnimationFrame(() => {
      initialHide.value = false
      enterAnim.value = true
      enterFallbackTimer = setTimeout(finalizeOpen, ENTER_ANIMATION_FALLBACK_MS)
    })
  })

  emitter.on('maximum', handleMaximize)
  emitter.on('restore', handleRestore)
  emitter.on('requestClose', requestClose)
  emitter.on('close', handleLegacyClose)
  emitter.on('top', handleBringToTop)
  emitter.on('afterOk', handleAfterOk)
  emitter.on('afterCancel', handleAfterCancel)
  emitter.on('afterCommand', handleAfterCommand)
  emitter.on('ok', handleOk)
})

watch(() => props.shade, syncScrollLock)

onUnmounted(() => {
  if (enterFallbackTimer) {
    clearTimeout(enterFallbackTimer)
    enterFallbackTimer = null
  }
  closeState.dispose()
  resizeObserver?.disconnect()
  resizeObserver = null
  layerSize.dispose()
  unbindDrag()
  if (hasScrollLock) {
    unlockBodyScroll()
    hasScrollLock = false
  }
  restorePreviousFocus()

  emitter.off('maximum', handleMaximize)
  emitter.off('restore', handleRestore)
  emitter.off('requestClose', requestClose)
  emitter.off('close', handleLegacyClose)
  emitter.off('top', handleBringToTop)
  emitter.off('afterOk', handleAfterOk)
  emitter.off('afterCancel', handleAfterCancel)
  emitter.off('afterCommand', handleAfterCommand)
  emitter.off('ok', handleOk)
})

defineExpose({
  id: props.id,
  close: () => void requestClose({ reason: 'programmatic' }),
  bringToTop: handleBringToTop,
  maximize: handleMaximize,
  restore: handleRestore
})
</script>
