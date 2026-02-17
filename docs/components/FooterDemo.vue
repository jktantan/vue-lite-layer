<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import TextContent from './TextContent.vue'
import CustomFooter from './CustomFooter.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, withLocale } = useDemoLocale()

const openDefaultFooter = () => {
  openLayer(
    withLocale({
      title: t.value.defaultFooter,
      content: TextContent,
      props: { text: t.value.defaultFooterDesc },
      size: { width: '420px', height: '250px' },
      footer: true
    }),
    appContext
  )
}

const openNoFooter = () => {
  openLayer(
    withLocale({
      title: t.value.hideFooter,
      content: TextContent,
      props: { text: t.value.hideFooterDesc },
      size: { width: '420px', height: '220px' },
      footer: false
    }),
    appContext
  )
}

const openCustomFooter = () => {
  openLayer(
    withLocale({
      title: t.value.customFooter,
      content: TextContent,
      props: { text: t.value.customFooterDesc },
      size: { width: '500px', height: '300px' },
      footer: CustomFooter
    }),
    appContext
  )
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.footerConfig }}</div>
    <button @click="openDefaultFooter">{{ t.defaultFooter }}</button>
    <button @click="openNoFooter" class="outline">{{ t.hideFooter }}</button>
    <button @click="openCustomFooter">{{ t.customFooter }}</button>
  </div>
</template>
