<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import TextContent from './TextContent.vue'
import CustomFooter from './CustomFooter.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, withLocale } = useDemoLocale()
const commandResult = ref('')

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
      footer: CustomFooter,
      onCommand: (command) => {
        commandResult.value = `${String(command)} — ${t.value.commandKeepsOpen}`
      }
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
    <p v-if="commandResult" style="margin: 10px 0 0; color: var(--vp-c-text-2); font-size: 13px">
      {{ commandResult }}
    </p>
  </div>
</template>
