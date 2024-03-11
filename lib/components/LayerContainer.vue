<template>
  <suspense>
    <div class="lite-layer__window-container">
      <div
        ref="container"
        class="lite-layer__window-wrapper"
        :class="[shadowTypeClass]"
        @scroll.prevent="onScroll"
      >
        <component :is="content" v-bind="props" ref="layerContent" />
      </div>
    </div>
  </suspense>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { ResizeObserver } from '@juggle/resize-observer'

const shadowTypeClass = ref<string>('')
const container = ref<HTMLElement>()
const layerContent = ref()
defineProps<{
  content: NonNullable<unknown> | string
  props?: object | null
}>()
const updateShadow = (target: HTMLElement) => {
  // 滑入屏幕滚动条滚动时，距离顶部的距离
  const scrollTop = target.scrollTop
  // 能看到的页面的高度
  const windowHeight = target.clientHeight
  // 监控的整个div的高度（包括现在看到的和上下隐藏起来看不到的）
  const scrollHeight = target.scrollHeight
  const total = scrollTop + windowHeight
  if (scrollHeight <= windowHeight) {
    shadowTypeClass.value = ''
  } else if (total >= scrollHeight - 10) {
    shadowTypeClass.value = 'lite-layer__shadow-top-inset'
    // 加载操作
  } else if (scrollTop <= 10) {
    shadowTypeClass.value = 'lite-layer__shadow-bottom-inset'
  } else {
    shadowTypeClass.value = 'lite-layer__shadow-horizontal-inset'
  }
}
const onScroll = (e: UIEvent) => {
  const target = e.target as HTMLElement
  updateShadow(target)
}
const resizeUpdate = new ResizeObserver(() => {
  updateShadow(container.value!)
})
onMounted(() => {
  resizeUpdate.observe(container.value as Element)
  // resizeUpdate.observe(layerContent.value as Element)
})

onUnmounted(() => {
  resizeUpdate.disconnect()
})

// defineExpose({
//   onOk,
//   onCancel,
//   onCommand
// })
</script>

<style scoped></style>
