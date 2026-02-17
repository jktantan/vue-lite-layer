<template>
  <suspense>
    <div class="lite-layer__window-container">
      <div
        ref="wrapperRef"
        class="lite-layer__window-wrapper"
        :class="[shadowClass]"
        @scroll="handleScroll"
      >
        <!-- 字符串内容直接渲染 / Render string content directly -->
        <div v-if="content && typeof content === 'string'" v-html="content"></div>
        <!-- 组件内容使用 component / Render component content using component -->
        <component v-else-if="content" :is="content" v-bind="props" ref="contentRef" />
      </div>
    </div>
    <template #fallback>
      <div class="lite-layer__window-container" style="display:flex;align-items:center;justify-content:center;">
        <div class="vll-loading-spinner" />
      </div>
    </template>
  </suspense>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { ResizeObserver } from '@juggle/resize-observer'

const shadowClass = ref('')
const wrapperRef = ref<HTMLElement>()
const contentRef = ref()

defineProps<{
  /** 弹层内容：Vue 组件或字符串 / Layer content: Vue component or string */
  content?: NonNullable<unknown> | string
  /** 传递给内容组件的 props / Props passed to content component */
  props?: object | null
}>()

/**
 * 根据滚动位置计算上下阴影样式
 * Calculate top and bottom shadow styles based on scroll position
 *
 * - 内容不超出容器：无阴影
 *   Content doesn't exceed container: no shadow
 * - 滚动到顶部：底部阴影
 *   Scrolled to top: bottom shadow
 * - 滚动到底部：顶部阴影
 *   Scrolled to bottom: top shadow
 * - 中间位置：上下双向阴影
 *   Middle position: both top and bottom shadows
 */
const updateShadow = (target: HTMLElement) => {
  const { scrollTop, clientHeight, scrollHeight } = target

  if (scrollHeight <= clientHeight) {
    shadowClass.value = ''
  } else if (scrollTop + clientHeight >= scrollHeight - 10) {
    shadowClass.value = 'lite-layer__shadow-top-inset'
  } else if (scrollTop <= 10) {
    shadowClass.value = 'lite-layer__shadow-bottom-inset'
  } else {
    shadowClass.value = 'lite-layer__shadow-horizontal-inset'
  }
}

const handleScroll = (e: Event) => {
  updateShadow(e.target as HTMLElement)
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!wrapperRef.value) return
  resizeObserver = new ResizeObserver(() => {
    if (wrapperRef.value) {
      updateShadow(wrapperRef.value)
    }
  })
  resizeObserver.observe(wrapperRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>
