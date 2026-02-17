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
  instance.value = openLayer(
    withLocale({
      title: t.value.instanceDemo,
      content: TextContent,
      props: { text: t.value.instanceDemoText },
      size: { width: '450px', height: '280px' },
      shade: false,
      footer: false
    }),
    appContext
  )
  isOpen.value = true
}

const handleMaximize = () => {
  instance.value?.maximize()
}

const handleRestore = () => {
  instance.value?.restore()
}

const handleBringToTop = () => {
  instance.value?.bringToTop()
}

const handleClose = () => {
  instance.value?.close()
  instance.value = null
  isOpen.value = false
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.instanceConfig }}</div>
    <button @click="handleOpen" :disabled="isOpen">{{ t.openLayer }}</button>
    <button @click="handleMaximize" class="outline" :disabled="!isOpen">{{ t.maximize }}</button>
    <button @click="handleRestore" class="outline" :disabled="!isOpen">{{ t.restore }}</button>
    <button @click="handleBringToTop" class="outline" :disabled="!isOpen">{{ t.bringToTop }}</button>
    <button @click="handleClose" class="outline" :disabled="!isOpen">{{ t.close }}</button>
  </div>
</template>
