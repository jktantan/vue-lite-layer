<script setup lang="ts">
import { ref } from 'vue'
import useLayerEvent from '../../lib/composables/use-layer-event'

const props = withDefaults(
  defineProps<{
    title?: string
    currentStatus?: string
    ready?: string
    saving?: string
    saved?: string
    desc?: string
  }>(),
  {
    title: 'Async Operation Demo',
    currentStatus: 'Current status:',
    ready: 'Ready',
    saving: 'Saving...',
    saved: 'Saved!',
    desc: 'Click OK to simulate 2-second async save with loading overlay.'
  }
)

const { onOk, onCancel, startLoading, stopLoading, resolveOk, close } = useLayerEvent()

const status = ref(props.ready)

onOk(async () => {
  status.value = props.saving
  startLoading()
  await new Promise((resolve) => setTimeout(resolve, 2000))
  stopLoading()
  status.value = props.saved
  resolveOk({ savedAt: new Date().toLocaleTimeString() })
  close()
})

onCancel(() => {
  close()
})
</script>

<template>
  <div class="demo-content">
    <h3>{{ title }}</h3>
    <p>
      {{ currentStatus }}<strong>{{ status }}</strong>
    </p>
    <p style="color: #909399; margin-top: 12px">
      {{ desc }}
    </p>
  </div>
</template>
