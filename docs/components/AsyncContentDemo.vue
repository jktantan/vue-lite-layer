<script setup lang="ts">
import { defineAsyncComponent, defineComponent, getCurrentInstance, h } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, withLocale } = useDemoLocale()

const openAsyncLayer = () => {
  let attempts = 0
  const AsyncContent = defineAsyncComponent({
    loader: async () => {
      attempts += 1
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (attempts === 1) throw new Error('Demo async component failed once')
      return defineComponent({
        setup: () => () => h('div', { style: 'padding: 20px' }, t.value.asyncRetrySuccess)
      })
    }
  })

  openLayer(
    withLocale({
      title: t.value.asyncContentTitle,
      content: AsyncContent,
      size: { width: '440px', height: '240px' },
      asyncContent: {
        loadingText: t.value.asyncLoading,
        errorText: t.value.asyncFailure,
        retryText: t.value.asyncRetry,
        timeout: 5_000,
        maxRetries: 2
      }
    }),
    appContext
  )
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.asyncContentConfig }}</div>
    <p style="color: var(--vp-c-text-2); font-size: 14px; margin-bottom: 12px">{{ t.asyncContentDesc }}</p>
    <button @click="openAsyncLayer">{{ t.openAsyncContent }}</button>
  </div>
</template>
