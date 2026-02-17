<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import TextContent from './TextContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, withLocale } = useDemoLocale()

const openSmall = () => {
  openLayer(
    withLocale({
      title: t.value.smallLayer,
      content: TextContent,
      props: { text: t.value.size250x180 },
      size: { width: '250px', height: '180px' }
    }),
    appContext
  )
}

const openMedium = () => {
  openLayer(
    withLocale({
      title: t.value.mediumLayer,
      content: TextContent,
      props: { text: t.value.size500x400 },
      size: { width: '500px', height: '400px' }
    }),
    appContext
  )
}

const openLarge = () => {
  openLayer(
    withLocale({
      title: t.value.largeLayer,
      content: TextContent,
      props: { text: t.value.size80x70 },
      size: { width: '80%', height: '70%' }
    }),
    appContext
  )
}

const openWithMaxSize = () => {
  openLayer(
    withLocale({
      title: t.value.maxSizeLayer,
      content: TextContent,
      props: { text: t.value.maxSizeDesc },
      size: { width: '90%', height: '80%' },
      maxWidth: '600px',
      maxHeight: '400px'
    }),
    appContext
  )
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.sizeConfig }}</div>
    <button @click="openSmall">{{ t.small }}</button>
    <button @click="openMedium">{{ t.medium }}</button>
    <button @click="openLarge">{{ t.large }}</button>
    <button @click="openWithMaxSize" class="outline">{{ t.maxSize }}</button>
  </div>
</template>
