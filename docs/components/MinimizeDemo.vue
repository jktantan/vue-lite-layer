<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import TextContent from './TextContent.vue'
import type { LayerInstance } from '../../lib/types/instance'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, withLocale } = useDemoLocale()
const instance = ref<LayerInstance | null>(null)
const isOpen = ref(false)

const handleOpen = () => {
  if (isOpen.value) return
  const layer = openLayer(
    withLocale({
      title: t.value.minimizableTitle,
      content: TextContent,
      props: { text: t.value.minimizableText },
      size: { width: '460px', height: '260px' },
      // 无遮罩：否则遮罩会盖住下方的「最小化 / 还原」等控制按钮，点不到。
      // No shade: otherwise the mask covers the control buttons below.
      shade: false,
      min: true
    }),
    appContext
  )
  instance.value = layer
  isOpen.value = true
  // 无论从哪个入口关闭（标题栏 / 遮罩 / Esc / 外部按钮），closed 都会 resolve；
  // 用它同步状态，按钮才不会停留在 disabled。
  // No matter which entry closes the layer (header / shade / Escape / external
  // button), `closed` always resolves — use it to sync state so the buttons
  // never get stuck disabled.
  layer?.closed.then(() => {
    instance.value = null
    isOpen.value = false
  })
}

const handleMinimize = () => instance.value?.minimize()
const handleRestore = () => instance.value?.restore()
const handleBringToTop = () => instance.value?.bringToTop()
const handleClose = () => instance.value?.close()
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.minimizeConfig }}</div>
    <p style="color: var(--vp-c-text-2); font-size: 14px; margin-bottom: 12px">
      {{ t.minimizeDesc }}
    </p>
    <button @click="handleOpen" :disabled="isOpen">{{ t.openMinimizableLayer }}</button>
    <button @click="handleMinimize" class="outline" :disabled="!isOpen">{{ t.minimize }}</button>
    <button @click="handleRestore" class="outline" :disabled="!isOpen">{{ t.restore }}</button>
    <button @click="handleBringToTop" class="outline" :disabled="!isOpen">
      {{ t.bringToTop }}
    </button>
    <button @click="handleClose" class="outline" :disabled="!isOpen">{{ t.close }}</button>
  </div>
</template>
