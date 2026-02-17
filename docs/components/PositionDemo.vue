<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import TextContent from './TextContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, format, withLocale } = useDemoLocale()

const positions = computed(() => [
  { label: t.value.posLT, value: 'LT' },
  { label: t.value.posLC, value: 'LC' },
  { label: t.value.posLB, value: 'LB' },
  { label: t.value.posCT, value: 'CT' },
  { label: t.value.posCC, value: 'CC' },
  { label: t.value.posCB, value: 'CB' },
  { label: t.value.posRT, value: 'RT' },
  { label: t.value.posRC, value: 'RC' },
  { label: t.value.posRB, value: 'RB' }
])

const openAtPosition = (label: string, location: string) => {
  openLayer(
    withLocale({
      title: format(t.value.positionAt, { label, loc: location }),
      content: TextContent,
      props: { text: format(t.value.positionDesc, { label, loc: location }) },
      size: { width: '300px', height: '180px' },
      location: location as any,
      shade: false
    }),
    appContext
  )
}

const openAtCustomPosition = () => {
  openLayer(
    withLocale({
      title: t.value.customCoord,
      content: TextContent,
      props: { text: t.value.customCoordDesc },
      size: { width: '350px', height: '180px' },
      location: { top: '50px', left: '100px' } as any,
      shade: false
    }),
    appContext
  )
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.positionConfig }}</div>
    <div
      style="
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        max-width: 400px;
        margin-bottom: 12px;
      "
    >
      <button
        v-for="pos in positions"
        :key="pos.value"
        class="outline"
        @click="openAtPosition(pos.label, pos.value)"
        style="margin: 0"
      >
        {{ pos.label }} ({{ pos.value }})
      </button>
    </div>
    <button @click="openAtCustomPosition">{{ t.customPosition }}</button>
  </div>
</template>
