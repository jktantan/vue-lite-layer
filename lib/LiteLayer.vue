<template>
  <Teleport :to="teleport">
    <div
      ref="layerRef"
      class="lite-layer"
      :data-layer-id="id"
      :style="{
        position: isTeleportToBody ? 'fixed' : 'absolute',
        'z-index': isMinimized ? MINIMIZED_DOCK_Z_INDEX : currentZIndex,
        pointerEvents: shade && !isMinimized ? 'auto' : 'none',
        ...layerStyle
      }"
    >
      <div
        v-if="shade && !isMinimized"
        class="lite-layer__shade"
        role="button"
        :aria-label="t('VueLiteLayer.close')"
        tabindex="-1"
        @click="handleShadeClick"
      />
      <div
        v-if="visible"
        ref="windowRef"
        class="lite-layer__window"
        role="dialog"
        :aria-modal="shade ? 'true' : 'false'"
        :aria-labelledby="titleId"
        tabindex="-1"
        :class="{
          'lite-layer__window--initial': initialHide,
          'lite-layer__window--enter': enterAnim,
          'lite-layer__window--leave': leaveAnim,
          'lite-layer__window--resizing': isResizing,
          'lite-layer__window--minimized': isMinimized
        }"
        :style="{
          maxWidth: maxWidth,
          maxHeight: maxHeight,
          pointerEvents: 'auto',
          ...layerSize.windowStyle,
          // 恢复过渡的起点矩形：只在这一帧覆盖 windowStyle，让窗口一落地
          // 就处在 dock 项的位置/尺寸上，随后由 withTransition 飞回原位。
          ...restoreStartStyle
        }"
        @mousedown="handleWindowMouseDown"
        @keydown="handleKeydown"
        @animationend="handleAnimationEnd"
      >
        <layer-header
          ref="headerRef"
          :title-id="titleId"
          :max="max"
          :min="min"
          :is-maximized="isMaximized"
          :is-minimized="isMinimized"
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
      <div
        v-if="visible && isMinimized"
        ref="dockRef"
        class="lite-layer__window-header lite-layer__dock-item"
        :class="{
          'is-minimize-enter': isMinimizing
        }"
        :style="{
          position: isTeleportToBody ? 'fixed' : 'absolute',
          left: dockPosition.left || `${dockLayout.left}px`,
          top: dockPosition.top,
          bottom: dockPosition.left ? 'auto' : `${dockLayout.bottom}px`
        }"
        @mousedown="handleDockMouseDown"
      >
        <div class="lite-layer__window-header-title" :title="title">
          {{ title || t('VueLiteLayer.restore') }}
        </div>
        <div class="lite-layer__window-header-operator" @mousedown.stop>
          <button
            type="button"
            class="lite-layer__mask-button lite-layer__icon-restore"
            :title="t('VueLiteLayer.restore')"
            :aria-label="t('VueLiteLayer.restore')"
            @click="handleRestore"
          />
          <button
            v-if="close"
            type="button"
            class="lite-layer__mask-button lite-layer__icon-close"
            :title="t('VueLiteLayer.close')"
            :aria-label="t('VueLiteLayer.close')"
            @click="handleLegacyClose"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  computed,
  reactive,
  ref,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  nextTick,
  watch,
  type ComponentPublicInstance
} from 'vue'
import { nanoid } from 'nanoid'
import useDraggable from './composables/use-draggable'

import LayerHeader from '@lib/components/LayerHeader.vue'
import LayerContainer from '@lib/components/LayerContainer.vue'
import LayerFooter from '@lib/components/LayerFooter.vue'
import './assets/style/index.scss'
import dockMetrics from './assets/style/metrics.module.scss'
import {
  type LayerArea,
  type LayerConfig,
  type Position,
  type WindowSize,
  PositionPreset
} from './types/layer'
import useLayerSize from './composables/use-layer-size'
import { withTransition, transitionDuration } from './composables/use-layer-size'
import { useLayerClose } from './composables/use-layer-close'
import { useLayerFocus } from './composables/use-layer-focus'
import layerManager from './core/layer-manager'
import { lockBodyScroll, unlockBodyScroll } from './core/scroll-lock'

import { useLayerEmitter } from './core/layer-emitter'
import { useI18n } from 'vue-i18n-lite'
import type { LayerCommandPayload } from './core/layer-events'
import LayerLoading from './components/LayerLoading.vue'

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
  min: false,
  close: true,
  closeOnOk: false,
  closeOnEsc: true,
  trapFocus: true,
  restoreFocus: true,
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
// Plain refs keep the library compatible with Vue 3.3/3.4, where
// `useTemplateRef` (Vue 3.5+) is not available. The template still binds by
// name (`ref="windowRef"`), which is the pre-3.5 contract.
const windowRef = ref<HTMLElement | null>(null)
const headerRef = ref<ComponentPublicInstance<{ el: HTMLElement }> | null>(null)
const layerRef = ref<HTMLElement | null>(null)
const dockRef = ref<HTMLElement | null>(null)

// ──── 状态 / State ────
const initialHide = ref(true) // 初始隐藏，等定位完成后移除 / Initially hidden, removed after positioning completes
const enterAnim = ref(false)
const isMaximized = ref(false)
const isMinimized = ref(false)
const maximizedBeforeMinimize = ref(false)
const isResizing = ref(false)
/**
 * 最小化过渡态：用于给 dock 项打 enter 动画类。最小化进行时 `isMinimizing=true`，
 * `isMinimized` 仍是 false（动画结束后才翻）。
 * Minimize transition flag: drives the dock item's enter animation class.
 */
const isMinimizing = ref(false)
/**
 * 恢复过渡的起点矩形（视口坐标）。恢复那一帧窗口重新回到 DOM 时，用这一帧的
 * 内联样式把它钉在 dock 项的位置/尺寸上，`withTransition` 才能从这里飞回原位。
 * 没有它的话窗口会直接出现在最终位置，恢复就完全没有位移动画。
 * Restore transition's starting rect (viewport coordinates). On the frame the
 * window re-enters the DOM, this pins it to the dock item's rect so
 * `withTransition` can fly it back to the original position. Without it the
 * window would pop straight into its final rect, leaving restore with no
 * position/size motion at all.
 */
const restoreStartStyle = ref<Partial<LayerArea>>({})
let minimizeFallbackTimer: ReturnType<typeof setTimeout> | null = null
let minimizeTransitionCleanup: (() => void) | null = null
let restoreTransitionCleanup: (() => void) | null = null
/**
 * 组件是否已经进入卸载流程。过渡的兜底定时器可能在卸载之后才触发，
 * 必须用它阻止 `finishMinimize` 重新把已移除的实例写回 layerManager。
 * Whether the component has entered teardown. Transition fallback timers can
 * fire after unmount; this flag stops `finishMinimize` from writing an already
 * removed instance back into layerManager.
 */
let disposed = false
const clearMinimizeFallback = () => {
  if (minimizeFallbackTimer) {
    clearTimeout(minimizeFallbackTimer)
    minimizeFallbackTimer = null
  }
}
const clearMinimizeTransition = () => {
  minimizeTransitionCleanup?.()
  minimizeTransitionCleanup = null
}
const clearRestoreTransition = () => {
  restoreTransitionCleanup?.()
  restoreTransitionCleanup = null
}
const MINIMIZED_DOCK_Z_INDEX = 2_147_483_647
/**
 * 停靠栏几何尺寸的唯一来源是 SCSS（metrics.module.scss 的 :export）。
 * 脚本不再自行硬编码这些值，避免与 style.scss 失去同步。
 * The single source of dock geometry is SCSS (metrics.module.scss :export);
 * the script no longer hard-codes these values, so it cannot drift from style.scss.
 */
const parseMetric = (raw: unknown, fallback: number): number => {
  // SCSS `:export` values usually come back as "220px" or numeric strings, but
  // some build pipelines strip the unit or return raw numbers. Match the first
  // numeric token so we accept all of these forms without producing NaN.
  const match = String(raw ?? '').match(/-?\d+(?:\.\d+)?/)
  const value = match ? Number.parseFloat(match[0]) : Number.NaN
  return Number.isFinite(value) ? value : fallback
}
const DOCK_ITEM_WIDTH = parseMetric(dockMetrics.dockItemWidth, 220)
const DOCK_ITEM_HEIGHT = parseMetric(dockMetrics.dockItemHeight, 40)
const DOCK_ITEM_GAP = parseMetric(dockMetrics.dockItemGap, 12)
const DOCK_INSET = parseMetric(dockMetrics.dockInset, 12)
const dockPosition = reactive({ left: '', top: '' })
let stopDockDrag: (() => void) | null = null
const titleId = `lite-layer-title-${props.id ?? nanoid()}`
const ENTER_ANIMATION_FALLBACK_MS = 220
let enterFallbackTimer: ReturnType<typeof setTimeout> | null = null
let hasOpened = false
let hasScrollLock = false

// ──── z-index 管理 / Z-index Management ────
const isTeleportToBody =
  props.teleport === 'body' || (typeof document !== 'undefined' && props.teleport === document.body)
const teleportGroup =
  props.teleportKey ?? (typeof props.teleport === 'string' ? props.teleport : 'body')
const currentZIndex = ref(layerManager.allocateZIndex(props.id!, teleportGroup))
const minimizedIndex = computed(() => {
  // 显式读 `minimizedGroups` 触发 reactive 订阅，
  // 否则 layerManager 的 Map.set 不会让 dock 几何重算，
  // 同组多 dock-item 时第二项会贴在第一项上。
  // Read `minimizedGroups` (reactive) to register a dep, so layerManager's
  // Map.set on the (non-reactive) minimizedIndex invalidates this computed.
  const groups = layerManager.getMinimizedGroups()
  // touch for reactivity
  void (groups.size >= 0)
  return layerManager.getMinimizedIndex(props.id!, teleportGroup)
})

/** 停靠栏可用区域的响应式尺寸（已排除滚动条） / Reactive size of the dock area (scrollbars excluded) */
const dockBounds = reactive({ width: 0, height: 0 })

/** 重新测量停靠栏可用区域（视口或 teleport 容器） / Re-measure the dock area (viewport or teleport container) */
const syncDockBounds = (): void => {
  if (isTeleportToBody) {
    dockBounds.width = document.documentElement.clientWidth
    dockBounds.height = document.documentElement.clientHeight
    return
  }
  const containerEl = layerRef.value
  if (!containerEl) return
  dockBounds.width = containerEl.clientWidth
  dockBounds.height = containerEl.clientHeight
}

/**
 * 停靠项在可视范围内的排布
 * Placement of dock items inside the visible area
 *
 * 一行放不下时换行并向上堆叠，使停靠项不会沿水平方向跑出可视区
 * （此前一直向右单行排列、被视口右侧裁掉）。
 * 注意：当项数超过可视高度能容纳的行数时，仍会向视口顶部溢出。
 * Wraps to a new row (stacked upward) once a row is full, so items never run
 * off the right edge horizontally (as single-row placement used to). Note that
 * once there are more items than the viewport height can hold, the stack still
 * overflows the top edge.
 */
const dockLayout = computed(() => {
  const index = Math.max(0, minimizedIndex.value)
  const stepX = DOCK_ITEM_WIDTH + DOCK_ITEM_GAP
  const stepY = DOCK_ITEM_HEIGHT + DOCK_ITEM_GAP
  // Guard against negative/NaN container dimensions. `dockBounds.width` can be
  // 0 before the layout settles, and a missing clientHeight during SSR or in
  // hidden iframes can yield NaN through `Math.floor(NaN)`. Clamp to a safe
  // single-column layout so dock coordinates never go negative.
  const usableWidth = Math.max(0, dockBounds.width) - DOCK_INSET + DOCK_ITEM_GAP
  const perRowRaw = Number.isFinite(usableWidth) && stepX > 0 ? Math.floor(usableWidth / stepX) : 1
  const perRow = Math.max(1, perRowRaw)
  const row = Math.floor(index / perRow)
  const col = index % perRow
  return { left: DOCK_INSET + col * stepX, bottom: DOCK_INSET + row * stepY }
})

/**
 * 停靠项当前在视口里的实际位置（视口坐标）。
 * Actual on-screen position of the dock item, in viewport coordinates.
 *
 * 用户拖动过的话用拖到的位置（`dockPosition`），否则用 dock 几何
 * （`dockLayout` + dock 高度推算的 top）。动画的起点/终点必须用这个值，
 * 跟着 dock 项的实时位置走；如果只参考 `dockLayout`，一旦用户拖了 dock
 * 项，最小化和恢复动画就会飞到错位的点，与 dock 项实际位置脱节。
 * The minimize/restore animation must use this resolved position so its
 * path tracks where the dock item actually lives (after a drag). Anchoring
 * to `dockLayout` alone would slide the window to a stale rect and break
 * the symmetry between minimize and restore.
 */
const dockItemRect = computed(() => {
  const dockW = DOCK_ITEM_WIDTH
  const dockH = DOCK_ITEM_HEIGHT
  const geometryTop = Math.max(0, dockBounds.height - dockLayout.value.bottom - dockH)
  const draggedLeft = parseFloat(dockPosition.left)
  const draggedTop = parseFloat(dockPosition.top)
  const left = Number.isFinite(draggedLeft) ? draggedLeft : dockLayout.value.left
  const top = Number.isFinite(draggedTop) ? draggedTop : geometryTop
  return { left, top, width: dockW, height: dockH }
})

// ──── 弹层尺寸与定位 / Layer Size and Positioning ────
const layerStyle = reactive<LayerArea>({
  top: '0px',
  left: '0px',
  // 100% 而非 100vw/100vh：固定定位下百分比相对初始包含块，
  // 会排除滚动条，而 100vw/100vh 包含滚动条，出现滚动条时会让容器
  // 比可视区更宽，窗口限位也随之失效。
  // 100% instead of 100vw/100vh: for a fixed element the percentage resolves
  // against the initial containing block, which excludes scrollbars, whereas
  // 100vw/100vh include them and would make the container wider than the
  // visible area, breaking window clamping when a scrollbar is present.
  width: '100%',
  height: '100%'
})
const emitter = useLayerEmitter()
const i18n = useI18n()
const t = i18n?.t ?? ((key: string) => key)
const layerSize = useLayerSize(props.size)
let resizeObserver: ResizeObserver | null = null
const closeState = useLayerClose(props, emitter, () => {
  enterAnim.value = false
})
const { visible, leaveAnim, isUnmounted, requestClose, finalizeClose } = closeState
const { capturePreviousFocus, focusWindow, handleKeydown, restorePreviousFocus } = useLayerFocus({
  getWindow: () => windowRef.value,
  getLayerRoot: () => layerRef.value,
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
  if (disposed || isUnmounted.value || isMinimizing.value) return
  if (isMinimized.value) {
    // 恢复路径：与 handleMinimize 严格对称的飞行式过渡——窗口从 dock 项的
    // 矩形出发，200ms 内位移 + 缩放回最小化前的原位/原尺寸。
    //   minimize = 窗口从当前位置缩到 dock 矩形，动画结束后切到 dock 项
    //   restore  = 切回窗口（先钉在 dock 矩形），再从 dock 矩形飞回原位
    // 关键是必须真的产生位移：窗口重新进入 DOM 时先钉在起点矩形，再由
    // withTransition 补间到目标。起点/终点都取 `dockItemRect`，所以居中的
    // 或用户拖拽过的 dock 项都能和最小化那段动画首尾相接。
    isMaximized.value = maximizedBeforeMinimize.value
    const windowEl = windowRef.value
    if (!windowEl) {
      isMinimized.value = false
      layerManager.restoreMinimized(props.id!, teleportGroup)
      syncScrollLock()
      handleBringToTop()
      focusWindow()
      return
    }
    // 目标矩形 = 最小化前记录下来的位置/尺寸（拖拽会同步进来）。
    const origin = layerSize.windowStyle
    const dockRect = dockItemRect.value
    restoreStartStyle.value = {
      top: `${dockRect.top}px`,
      left: `${dockRect.left}px`,
      width: `${dockRect.width}px`,
      height: `${dockRect.height}px`
    }
    // 去掉 --minimized（display:none），窗口先以起点矩形回到 DOM；
    // display:none 的元素没有可视盒，transition 不会启动——所以这一步
    // 必须在 withTransition 之前，且起点样式要在同一帧就位（由
    // restoreStartStyle 经渲染层写入）避免窗口先闪现在原位。
    isMinimized.value = false
    // 同步把内联样式钉到起点矩形。此刻元素仍是 display:none，写样式不影响
    // 布局；这样下一帧 display 恢复时窗口就直接出现在 dock 位置，而不是先
    // 闪一下原位再飞。restoreStartStyle 负责让渲染层在那一帧也保持起点值。
    Object.assign(windowEl.style, restoreStartStyle.value)
    nextTick(() => {
      if (disposed || isUnmounted.value) return
      const el = windowRef.value
      if (!el) return
      // 强制一次 reflow，让渲染层写好的起点矩形成为“当前样式”。否则
      // display:none → 显示 与改目标会落在同一帧，浏览器可能直接以终点
      // 起步、整段恢复一点补间都没有。
      void el.offsetWidth
      restoreTransitionCleanup = withTransition(
        el,
        () => {
          // 清掉起点覆盖并直接写目标：渲染层随后刷成同一个 windowStyle，
          // 浏览器按已生效的 transition 从起点补间到目标。
          restoreStartStyle.value = {}
          el.style.top = origin.top
          el.style.left = origin.left
          el.style.width = origin.width
          el.style.height = origin.height
        },
        () => {
          restoreTransitionCleanup = null
          restoreStartStyle.value = {}
          if (disposed || isUnmounted.value) return
          layerManager.restoreMinimized(props.id!, teleportGroup)
          syncScrollLock()
          handleBringToTop()
          focusWindow()
        }
      )
    })
    return
  }
  isMaximized.value = false
  // 还原会解除最大化时取得的滚动锁，可视区随之变化
  // Restoring releases the scroll lock taken while maximized.
  syncScrollLock()
  isResizing.value = true
  layerSize.restore(windowRef.value, layerRef.value, () => {
    isResizing.value = false
  })
}

const handleMaximize = () => {
  if (disposed || isUnmounted.value || isMinimizing.value || !props.max) return
  if (isMinimized.value) {
    isMinimized.value = false
    layerManager.restoreMinimized(props.id!, teleportGroup)
    syncScrollLock()
    handleBringToTop()
  }
  isMaximized.value = true
  // 最大化会锁滚动并隐藏根滚动条，可视区因此变宽，可用尺寸需要重算，
  // 否则最大化窗口会留下一条与滚动条等宽的空隙。
  // Maximizing locks scrolling and hides the root scrollbar, which widens the
  // visible area; re-measure so the window does not leave a scrollbar-wide gap.
  syncScrollLock()
  layerSize.setMaximumSize(layerRef.value)
  isResizing.value = true
  layerSize.maximize(windowRef.value, () => {
    isResizing.value = false
  })
}

const handleMinimize = () => {
  if (
    disposed ||
    isUnmounted.value ||
    leaveAnim.value ||
    !props.min ||
    isMinimized.value ||
    isMinimizing.value
  ) {
    return
  }
  const windowEl = windowRef.value
  if (!windowEl) return
  maximizedBeforeMinimize.value = isMaximized.value
  isMinimizing.value = true
  // 注意：这里绝不能顺手 `isMaximized.value = false`。`isMaximized` 被
  // LayerHeader 的 prop 读取，翻它会让 LiteLayer 重新渲染，而窗口的
  // `:style` 绑定了 `layerSize.windowStyle`（最大化尺寸），patch 时会把
  // 它整体写回内联样式，正好盖掉下面 withTransition 刚写好的 dock 目标，
  // 结果窗口留在最大化尺寸、一动不动——这就是「最大化后最小化没有动画」。
  // `isMaximized` 的翻转推迟到过渡结束（onComplete / 兜底）再和
  // `isMinimized` 一起做；那时窗口已被 --minimized 隐藏，重渲染无害。
  // Do NOT flip `isMaximized` here: it is read by LayerHeader's prop, so
  // flipping it re-renders LiteLayer, and the window's `:style` is bound to
  // `layerSize.windowStyle` (the maximized size). The subsequent patch writes
  // that whole style object back onto the element, clobbering the dock target
  // that withTransition just wrote - leaving the window at the maximized size
  // and motionless (the "no animation when minimizing from maximized" bug).
  // Flip it together with `isMinimized` at the end of the transition instead.
  // 计算 dock 矩形（top = 视口高 - bottom 偏移 - 项高）
  // 必须用 dock 项实际位置：用户拖过的话，动画终点要跟过去，否则
  // 窗口会飞到 dock 几何位置、和 dock 项实际位置错开。
  // Use the dock item's actual position (tracks user drag) so the fly
  // target stays in sync with where the dock item really lives.
  const dockW = DOCK_ITEM_WIDTH
  const dockH = DOCK_ITEM_HEIGHT
  const dockLeft = dockItemRect.value.left
  const dockTop = dockItemRect.value.top
  // 先把窗口当前位置固化到 style（防 Vue 重渲染抹掉），再让 withTransition
  // 平滑过渡到 dock 矩形；过渡结束（或兜底定时器）后再翻 isMinimized 并
  // 通知 layerManager，避免动画期间层管理器把 dock 顺序算错。
  const currentRect = windowEl.getBoundingClientRect()
  windowEl.style.top = currentRect.top + 'px'
  windowEl.style.left = currentRect.left + 'px'
  windowEl.style.width = currentRect.width + 'px'
  windowEl.style.height = currentRect.height + 'px'
  clearMinimizeFallback()
  const finishMinimize = () => {
    if (disposed || isUnmounted.value || isMinimized.value) return
    isMinimizing.value = false
    isMaximized.value = false
    isMinimized.value = true
    layerManager.minimize(props.id!, teleportGroup)
    syncScrollLock()
  }
  minimizeTransitionCleanup = withTransition(
    windowEl,
    () => {
      windowEl.style.top = dockTop + 'px'
      windowEl.style.left = dockLeft + 'px'
      windowEl.style.width = dockW + 'px'
      windowEl.style.height = dockH + 'px'
    },
    () => {
      minimizeTransitionCleanup = null
      finishMinimize()
      clearMinimizeFallback()
    }
  )
  // 兜底：若 transitionend 因元素被 v-if 隐藏等原因未触发，也要在
  // transitionDuration + 25ms 后强制收尾，避免 isMinimizing 永久卡住
  minimizeFallbackTimer = setTimeout(() => {
    if (disposed || isUnmounted.value || !isMinimizing.value) return
    finishMinimize()
  }, transitionDuration + 25)
}

/** Drag the minimized title bar without changing the restored window position. */
const handleDockMouseDown = (event: MouseEvent) => {
  if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
  const dockEl = dockRef.value
  if (!dockEl) return

  stopDockDrag?.()
  const dockRect = dockEl.getBoundingClientRect()
  // 用 clientWidth/clientHeight（排除滚动条）作为拖拽边界，
  // 否则停靠项可以被拖到滚动条下方。
  // Use clientWidth/clientHeight (scrollbars excluded) as the drag bounds,
  // otherwise a dock item can be dragged underneath the scrollbar.
  let containerRect: { left: number; top: number; width: number; height: number } | null = null
  if (isTeleportToBody) {
    containerRect = {
      left: 0,
      top: 0,
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight
    }
  } else if (layerRef.value) {
    const layerRect = layerRef.value.getBoundingClientRect()
    containerRect = {
      left: layerRect.left,
      top: layerRect.top,
      width: layerRef.value.clientWidth,
      height: layerRef.value.clientHeight
    }
  }
  if (!containerRect) return
  const offsetX = event.clientX - dockRect.left
  const offsetY = event.clientY - dockRect.top

  const handleMouseMove = (moveEvent: MouseEvent) => {
    const maxLeft = Math.max(0, containerRect.width - dockRect.width)
    const maxTop = Math.max(0, containerRect.height - dockRect.height)
    dockPosition.left = `${Math.min(Math.max(0, moveEvent.clientX - containerRect.left - offsetX), maxLeft)}px`
    dockPosition.top = `${Math.min(Math.max(0, moveEvent.clientY - containerRect.top - offsetY), maxTop)}px`
  }
  const handleMouseUp = () => stopDockDrag?.()
  stopDockDrag = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    stopDockDrag = null
  }
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
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
  // 遮罩弹层本身就锁滚动；最大化弹层同样占满可视区，也必须锁滚动，
  // 否则根滚动条会留在最大化窗口旁边（即“最大化没有隐藏滚动条”）。
  // A shaded layer already locks scrolling; a maximized layer fills the
  // visible area too, so it must lock as well — otherwise the root scrollbar
  // stays visible beside the maximized window.
  const shouldLock = isTeleportToBody && (props.shade || isMaximized.value) && !isMinimized.value
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
  syncDockBounds()
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
  // ResizeObserver ships natively in current evergreen browsers. Keeping the
  // polyfill as a static import added ~5KB gzip to every consumer; hosts that
  // still target older engines can install a polyfill before the plugin.
  const ResizeObserverCtor = typeof ResizeObserver === 'undefined' ? null : ResizeObserver
  if (ResizeObserverCtor) {
    resizeObserver = new ResizeObserverCtor(handleContainerResize)
  }
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
    if (resizeObserver && layerRef.value?.parentNode) {
      resizeObserver.observe(layerRef.value.parentNode as Element)
    }
  } else if (resizeObserver && layerRef.value) {
    resizeObserver.observe(layerRef.value)
  }

  nextTick(() => {
    layerSize.setDefaultSize(windowRef.value)
    layerSize.setMaximumSize(layerRef.value)
    syncDockBounds()
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
  emitter.on('minimize', handleMinimize)
  emitter.on('restore', handleRestore)
  emitter.on('requestClose', requestClose)
  emitter.on('close', handleLegacyClose)
  emitter.on('top', handleBringToTop)
  emitter.on('afterOk', handleAfterOk)
  emitter.on('afterCancel', handleAfterCancel)
  emitter.on('afterCommand', handleAfterCommand)
  emitter.on('ok', handleOk)
})

watch([() => props.shade, isMinimized, isMaximized], syncScrollLock)

const isSameSize = (a?: WindowSize, b?: WindowSize): boolean =>
  a?.width === b?.width && a?.height === b?.height

const isSameLocation = (a?: Position | PositionPreset, b?: Position | PositionPreset): boolean => {
  if (a === b) return true
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return a.top === b.top && a.left === b.left
  }
  return false
}

/**
 * Re-applies `size` / `location` when `instance.update()` changes them.
 *
 * The layer only writes the live window while it is in its normal state. When
 * maximized, only the stored default size/position are updated so the next
 * restore uses the new values; when minimized, the stored restore target is
 * updated (unless the layer was maximized before minimizing, in which case the
 * maximized `windowStyle` must be preserved).
 */
watch(
  [() => props.size, () => props.location],
  ([nextSize, nextLocation], [prevSize, prevLocation]) => {
    if (disposed || isUnmounted.value) return

    const maximized = isMaximized.value
    const minimized = isMinimized.value
    const storeStyle = !maximized && !(minimized && maximizedBeforeMinimize.value)
    const applyToWindow = !maximized && !minimized

    if (!isSameSize(nextSize, prevSize)) {
      layerSize.applySize(nextSize, windowRef.value, layerRef.value, {
        applyToWindow,
        storeStyle,
        maxWidth: props.maxWidth,
        maxHeight: props.maxHeight
      })
    }
    if (!isSameLocation(nextLocation, prevLocation)) {
      layerSize.applyPosition(nextLocation, windowRef.value, layerRef.value, {
        applyToWindow,
        storeStyle
      })
    }
  },
  { deep: true }
)

// Focus can only be restored while the focused element is still in the DOM.
// `onUnmounted` runs after Vue has removed the subtree, at which point the
// browser has already moved focus to <body>, so the containment check in
// `restorePreviousFocus` would always fail. Restore in `onBeforeUnmount`.
onBeforeUnmount(restorePreviousFocus)

onUnmounted(() => {
  disposed = true
  clearMinimizeTransition()
  clearRestoreTransition()
  if (enterFallbackTimer) {
    clearTimeout(enterFallbackTimer)
    enterFallbackTimer = null
  }
  clearMinimizeFallback()
  closeState.dispose()
  resizeObserver?.disconnect()
  resizeObserver = null
  layerSize.dispose()
  stopDockDrag?.()
  unbindDrag()
  if (hasScrollLock) {
    unlockBodyScroll()
    hasScrollLock = false
  }

  emitter.off('maximum', handleMaximize)
  emitter.off('minimize', handleMinimize)
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
  minimize: handleMinimize,
  restore: handleRestore
})
</script>
