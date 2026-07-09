<template>
  <suspense>
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
        <component v-else-if="content" :is="content" v-bind="props" ref="contentRef" />
      </div>
    </div>
    <template #fallback>
      <div
        class="lite-layer__window-container"
        style="display: flex; align-items: center; justify-content: center"
      >
        <div class="vll-loading-spinner" />
      </div>
    </template>
  </suspense>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { ResizeObserver } from '@juggle/resize-observer'
import type { Component } from 'vue'
import type { LayerContentType } from '@lib/types/layer'
import { warnIfUnsafeHtml } from '@lib/core/html-safety'

interface LayerContainerProps {
  content?: Component | HTMLElement | string
  textContent?: string
  contentType?: LayerContentType
  props?: object | null
}

const layerProps = withDefaults(defineProps<LayerContainerProps>(), {
  contentType: 'html',
  props: null
})

const shadowClass = ref('')
const wrapperRef = useTemplateRef<HTMLElement>('wrapperRef')
const elementHostRef = useTemplateRef<HTMLElement>('elementHostRef')
const contentRef = useTemplateRef('contentRef')
let scrollFrame = 0
let mountedElement: HTMLElement | null = null
let originalParent: ParentNode | null = null
let originalNextSibling: ChildNode | null = null

const isHTMLElementContent = computed(() => {
  return typeof HTMLElement !== 'undefined' && layerProps.content instanceof HTMLElement
})

const normalizedContentType = computed<LayerContentType>(() => {
  if (layerProps.contentType === 'html' || layerProps.contentType == null) return 'html'
  return 'text'
})

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

const clearHTMLElementContent = (): void => {
  restoreHTMLElementContent()
  elementHostRef.value?.replaceChildren()
}

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

const setShadowClass = (nextClass: string): void => {
  if (shadowClass.value !== nextClass) {
    shadowClass.value = nextClass
  }
}

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

const scheduleShadowUpdate = (target: HTMLElement): void => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
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
    clearHTMLElementContent()
    if (textContent == null && typeof content === 'string' && contentType === 'html') {
      warnIfUnsafeHtml(content)
    }
    await nextTick()
    renderHTMLElementContent()
  },
  { immediate: true }
)

onMounted(() => {
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
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
  clearHTMLElementContent()
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>
