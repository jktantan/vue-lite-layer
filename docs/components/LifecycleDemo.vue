<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import TextContent from './TextContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, withLocale } = useDemoLocale()
const result = ref('')

const openLifecycleLayer = () => {
  result.value = t.value.lifecycleOpened
  const instance = openLayer(
    withLocale({
      title: t.value.lifecycleTitle,
      content: TextContent,
      props: { text: t.value.lifecycleDesc },
      size: { width: '460px', height: '260px' },
      beforeClose: async () => window.confirm(t.value.lifecycleConfirm),
      onOpened: () => (result.value = t.value.lifecycleReady)
    }),
    appContext
  )

  setTimeout(() => instance?.update({ title: t.value.lifecycleUpdatedTitle }), 800)
  instance?.closed.then((closeResult) => {
    result.value = `${t.value.lifecycleClosed}: ${closeResult.action} / ${closeResult.reason}`
  })
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.lifecycleConfig }}</div>
    <button @click="openLifecycleLayer">{{ t.openLifecycle }}</button>
    <p v-if="result" style="margin: 10px 0 0; color: var(--vp-c-text-2); font-size: 13px">{{ result }}</p>
  </div>
</template>
