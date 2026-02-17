<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import TextContent from './TextContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, withLocale } = useDemoLocale()

const openShadeClose = () => {
  openLayer(
    withLocale({
      title: t.value.shadeClickClose,
      content: TextContent,
      props: { text: t.value.clickShadeClose },
      size: { width: '420px', height: '220px' },
      shade: true,
      shadeClose: true
    }),
    appContext
  )
}

const openShadeNoClose = () => {
  openLayer(
    withLocale({
      title: t.value.shadeClickNoClose,
      content: TextContent,
      props: { text: t.value.clickShadeNoClose },
      size: { width: '420px', height: '240px' },
      shade: true,
      shadeClose: false
    }),
    appContext
  )
}

const openNoShade = () => {
  openLayer(
    withLocale({
      title: t.value.noShade,
      content: TextContent,
      props: { text: t.value.noShadeLayerDesc },
      size: { width: '380px', height: '200px' },
      shade: false
    }),
    appContext
  )
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.shadeConfig }}</div>
    <button @click="openShadeClose">{{ t.shadeClickClose }}</button>
    <button @click="openShadeNoClose">{{ t.shadeClickNoClose }}</button>
    <button @click="openNoShade" class="outline">{{ t.noShadeBtn }}</button>
  </div>
</template>
