<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import TextContent from './TextContent.vue'
import type { LayerInstance } from '../../lib/types/instance'

const { appContext } = getCurrentInstance()!
const { openLayer, closeAllLayer } = useLiteLayer()
const { t, format, withLocale } = useDemoLocale()
const instances = ref<LayerInstance[]>([])
const uniqueLog = ref('')

let counter = 0

const openMultiple = () => {
  counter++
  const instance = openLayer(
    withLocale({
      title: format(t.value.layerN, { n: counter }),
      content: TextContent,
      props: { text: format(t.value.layerNText, { n: counter }) },
      size: { width: '350px', height: '200px' },
      shade: false,
      location: {
        top: `${100 + (counter % 5) * 30}px`,
        left: `${300 + (counter % 5) * 40}px`
      } as any
    }),
    appContext
  )
  if (instance) {
    instances.value.push(instance)
  }
}

const closeAll = () => {
  closeAllLayer()
  instances.value = []
  counter = 0
  uniqueLog.value = ''
}

const openUniqueGroup = () => {
  const instance = openLayer(
    withLocale({
      title: t.value.uniqueGroupLayer,
      content: TextContent,
      props: { text: t.value.uniqueGroupText },
      size: { width: '400px', height: '220px' },
      uniqueGroup: 'settings',
      shade: false
    }),
    appContext
  )
  if (instance) {
    uniqueLog.value = t.value.uniqueGroupOpened
  } else {
    uniqueLog.value = t.value.uniqueGroupBlocked
  }
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.multiLayerConfig }}</div>
    <button @click="openMultiple">{{ t.openMultiple }}</button>
    <button @click="openUniqueGroup">{{ t.uniqueGroup }}</button>
    <button @click="closeAll" class="outline">{{ t.closeAll }}</button>
    <p v-if="instances.length" style="margin-top: 12px; font-size: 13px; color: var(--vp-c-text-2)">
      {{ format(t.layersOpened, { n: instances.length }) }}
    </p>
    <p
      v-if="uniqueLog"
      style="margin-top: 8px; font-size: 13px; font-weight: 500"
      :style="{ color: uniqueLog.includes('拦截') || uniqueLog.includes('Blocked') ? '#e6a23c' : 'var(--vp-c-brand-1)' }"
    >
      {{ uniqueLog }}
    </p>
  </div>
</template>
