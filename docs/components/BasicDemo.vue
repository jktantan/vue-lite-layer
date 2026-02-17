<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import ContentComponent from './ContentComponent.vue'
import TextContent from './TextContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, withLocale } = useDemoLocale()
const result = ref('')

const openTextLayer = () => {
  openLayer(
    withLocale({
      title: t.value.basicLayer,
      content: TextContent,
      props: { text: t.value.basicLayerText },
      size: { width: '400px', height: '250px' }
    }),
    appContext
  )
}

const openComponentLayer = () => {
  result.value = ''
  openLayer(
    withLocale({
      title: t.value.componentContentLayer,
      content: ContentComponent,
      props: {
        greeting: t.value.pleaseFillInfo,
        nameLabel: t.value.nameLabel,
        namePlaceholder: t.value.namePlaceholder,
        emailLabel: t.value.emailLabel,
        emailPlaceholder: t.value.emailPlaceholder
      },
      size: { width: '450px', height: '320px' },
      onOk: (message: any) => {
        result.value = JSON.stringify(message, null, 2)
      }
    }),
    appContext
  )
}

const openNoFooterLayer = () => {
  openLayer(
    withLocale({
      title: t.value.noFooter,
      content: TextContent,
      props: { text: t.value.noFooterLayerText },
      size: { width: '400px', height: '200px' },
      footer: false
    }),
    appContext
  )
}

const openNoShadeLayer = () => {
  openLayer(
    withLocale({
      title: t.value.noShade,
      content: TextContent,
      props: { text: t.value.noShadeLayerText },
      size: { width: '350px', height: '200px' },
      shade: false
    }),
    appContext
  )
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.basic }}</div>
    <button @click="openTextLayer">{{ t.textLayer }}</button>
    <button @click="openComponentLayer">{{ t.componentLayer }}</button>
    <button @click="openNoFooterLayer" class="outline">{{ t.noFooter }}</button>
    <button @click="openNoShadeLayer" class="outline">{{ t.noShade }}</button>
    <div
      v-if="result"
      style="
        margin-top: 16px;
        padding: 12px;
        background: var(--vp-c-bg);
        border-radius: 6px;
        font-size: 13px;
      "
    >
      <strong>{{ t.componentReturnData }}</strong>
      <pre style="margin: 8px 0 0; white-space: pre-wrap">{{ result }}</pre>
    </div>
  </div>
</template>
