<template>
  <div v-if="contentError" class="lite-layer__window-container">
    <div class="lite-layer__window-wrapper lite-layer__content-error" role="alert">
      <p>{{ asyncContent?.errorText ?? '内容加载失败。' }}</p>
      <button
        type="button"
        class="lite-layer__button primary"
        :disabled="!canRetry || isRetrying"
        @click="retryContent"
      >
        {{ asyncContent?.retryText ?? '重试' }}
      </button>
    </div>
  </div>
  <suspense v-else @pending="handlePending" @resolve="clearLoadingTimeout">
    <div class="lite-layer__window-container">
      <div
        ref="wrapperRef"
        class="lite-layer__window-wrapper"
        :class="[shadowClass]"
        @scroll.passive="handleScroll"
      >
        <div v-if="textContent != null">{{ textContent }}</div>
        <div v-else-if="isHTMLElementContent" ref="elementHostRef"></div>
        <div v-else-if="content && typeof content === 'string' && normalizedContentType === 'text'">
          {{ content }}
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-else-if="content && typeof content === 'string'" v-html="content"></div>
        <component v-else-if="content" :is="content" :key="contentKey" v-bind="props" ref="contentRef" />
      </div>
    </div>
    <template #fallback>
      <div
        class="lite-layer__window-container"
        style="display: flex; align-items: center; justify-content: center"
      >
        <div class="vll-loading-spinner" />
        <span v-if="asyncContent?.loadingText" style="margin-left: 10px">{{ asyncContent.loadingText }}</span>
      </div>
    </template>
  </suspense>
</template>

<script lang="ts" setup>
import {
  computed,
  nextTick,
  onErrorCaptured,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch
} from 'vue'
import { ResizeObserver } from '@juggle/resize-observer'
import type { Component } from 'vue'
import type { AsyncContentConfig, LayerContentType } from '@lib/types/layer'
import { warnIfUnsafeHtml } from '@lib/core/html-safety'

interface LayerContainerProps {
  content?: Component | HTMLElement | string
  textContent?: string
  contentType?: LayerContentType
  props?: object | null
  asyncContent?: AsyncContentConfig
}

const layerProps = withDefaults(defineProps<LayerContainerProps>(), {
  contentType: 'html',
  props: null
})

const shadowClass = ref('')
const wrapperRef = useTemplateRef<HTMLElement>('wrapperRef')
const elementHostRef = useTemplateRef<HTMLElement>('elementHostRef')
const contentRef = useTemplateRef('contentRef')
const contentError = ref<unknown>(null)
const contentKey = ref(0)
const retryCount = ref(0)
const isRetrying = ref(false)
let scrollFrame = 0
let loadingTimeout: ReturnType<typeof setTimeout> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let mountedElement: HTMLElement | null = null
let originalParent: ParentNode | null = null
let originalNextSibling: ChildNode | null = null

/** 判断 content 是否为 HTMLElement 实例 / Check if content is an HTMLElement instance */
const isHTMLElementContent = computed(() => {
  return typeof HTMLElement !== 'undefined' && layerProps.content instanceof HTMLElement
})

/** 归一化 contentType：仅允许 'html' 或 'text' / Normalize contentType: only allow 'html' or 'text' */
const normalizedContentType = computed<LayerContentType>(() => {
  if (layerProps.contentType === 'html' || layerProps.contentType == null) return 'html'
  return 'text'
})

const canRetry = computed(() => {
  const maxRetries = layerProps.asyncContent?.maxRetries
  return maxRetries == null || retryCount.value < maxRetries
})

const clearLoadingTimeout = (): void => {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout)
    loadingTimeout = null
  }
}

const handlePending = (): void => {
  clearLoadingTimeout()
  const timeout = layerProps.asyncContent?.timeout
  if (!timeout || timeout <= 0) return
  loadingTimeout = setTimeout(() => {
    loadingTimeout = null
    const error = new Error(`Async layer content timed out after ${timeout}ms`)
    contentError.value = error
    layerProps.asyncContent?.onTimeout?.()
    layerProps.asyncContent?.onError?.(error)
  }, timeout)
}

const retryContent = (): void => {
  if (!canRetry.value || isRetrying.value) return
  retryCount.value += 1
  layerProps.asyncContent?.onRetry?.(retryCount.value)
  isRetrying.value = true
  const retry = () => {
    retryTimer = null
    contentError.value = null
    contentKey.value += 1
    isRetrying.value = false
  }
  const retryDelay = layerProps.asyncContent?.retryDelay ?? 0
  if (retryDelay > 0) {
    retryTimer = setTimeout(retry, retryDelay)
  } else {
    retry()
  }
}

const resetAsyncState = (): void => {
  clearLoadingTimeout()
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  contentError.value = null
  retryCount.value = 0
  isRetrying.value = false
}

onErrorCaptured((error) => {
  clearLoadingTimeout()
  contentError.value = error
  layerProps.asyncContent?.onError?.(error)
  // The error is represented by the retry UI; do not also surface it as an
  // uncaught application error.
  return false
})

/**
 * 将 HTMLElement 内容恢复到原始 DOM 位置
 * Restore HTMLElement content to its original DOM position
 */
const restoreHTMLElementContent = (): void => {
  if (!mountedElement) return

  const element = mountedElement
  const parent = originalParent
  const nextSibling = originalNextSibling

  mountedElement = null
  originalParent = null
  originalNextSibling = null

  if (!parent) {
    element.remove()
    return
  }

  if (nextSibling && nextSibling.parentNode === parent) {
    parent.insertBefore(element, nextSibling)
    return
  }

  parent.appendChild(element)
}

/** 清除已挂载的 HTMLElement 内容并恢复原位 / Clear mounted HTMLElement content and restore to original position */
const clearHTMLElementContent = (): void => {
  restoreHTMLElementContent()
  elementHostRef.value?.replaceChildren()
}

/**
 * 将 HTMLElement 类型的 content 挂载到宿主容器中
 * Mount HTMLElement-type content into the host container
 */
const renderHTMLElementContent = (): void => {
  const host = elementHostRef.value
  if (!host) return

  restoreHTMLElementContent()
  host.replaceChildren()
  if (isHTMLElementContent.value && layerProps.textContent == null) {
    const element = layerProps.content as HTMLElement
    originalParent = element.parentNode
    originalNextSibling = element.nextSibling
    mountedElement = element
    host.appendChild(element)
  }
}

/** 设置滚动阴影 CSS 类（去重更新） / Set scroll shadow CSS class (deduplicated update) */
const setShadowClass = (nextClass: string): void => {
  if (shadowClass.value !== nextClass) {
    shadowClass.value = nextClass
  }
}

/**
 * 根据滚动位置计算并更新内容区域的阴影效果
 * Calculate and update content area shadow effect based on scroll position
 */
const updateShadow = (target: HTMLElement): void => {
  const { scrollTop, clientHeight, scrollHeight } = target

  if (scrollHeight <= clientHeight) {
    setShadowClass('')
  } else if (scrollTop + clientHeight >= scrollHeight - 10) {
    setShadowClass('lite-layer__shadow-top-inset')
  } else if (scrollTop <= 10) {
    setShadowClass('lite-layer__shadow-bottom-inset')
  } else {
    setShadowClass('lite-layer__shadow-horizontal-inset')
  }
}

/** 通过 requestAnimationFrame 节流的阴影更新调度 / Throttled shadow update scheduling via requestAnimationFrame */
const scheduleShadowUpdate = (target: HTMLElement): void => {
  // Scroll events can fire several times before the next paint. One pending
  // frame already uses the same scroll container, so scheduling another one
  // only creates needless cancel/requeue work.
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    updateShadow(target)
  })
}

const handleScroll = (e: Event): void => {
  scheduleShadowUpdate(e.target as HTMLElement)
}

let resizeObserver: ResizeObserver | null = null

watch(
  () => [layerProps.content, layerProps.textContent, normalizedContentType.value] as const,
  async ([content, textContent, contentType]) => {
    resetAsyncState()
    clearHTMLElementContent()
    if (textContent == null && typeof content === 'string' && contentType === 'html') {
      warnIfUnsafeHtml(content)
    }
    await nextTick()
    renderHTMLElementContent()
  }
)

onMounted(() => {
  if (
    layerProps.textContent == null &&
    typeof layerProps.content === 'string' &&
    normalizedContentType.value === 'html'
  ) {
    warnIfUnsafeHtml(layerProps.content)
  }
  renderHTMLElementContent()
  if (!wrapperRef.value) return
  resizeObserver = new ResizeObserver(() => {
    if (wrapperRef.value) {
      scheduleShadowUpdate(wrapperRef.value)
    }
  })
  resizeObserver.observe(wrapperRef.value)
})

onUnmounted(() => {
  resetAsyncState()
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
  clearHTMLElementContent()
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>
