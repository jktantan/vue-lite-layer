<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import LoadingContent from './LoadingContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, format, withLocale } = useDemoLocale()

const openWithLoading = () => {
  openLayer(
    withLocale({
      title: t.value.loadingDemo,
      content: LoadingContent,
      props: {
        title: t.value.asyncDemo,
        currentStatus: t.value.currentStatus,
        ready: t.value.ready,
        saving: t.value.saving,
        saved: t.value.saved,
        desc: t.value.asyncDesc
      },
      size: { width: '450px', height: '280px' },
      onOk: (message: any) => {
        alert(format(t.value.saveSuccess, { data: JSON.stringify(message) }))
      }
    }),
    appContext
  )
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.loadingConfig }}</div>
    <p style="color: var(--vp-c-text-2); font-size: 14px; margin-bottom: 12px">
      {{ t.loadingDesc }}
    </p>
    <button @click="openWithLoading">{{ t.openLoadingLayer }}</button>
  </div>
</template>
