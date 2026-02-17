<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import { useDemoLocale } from '../composables/use-demo-locale'
import ContentComponent from './ContentComponent.vue'
import EventContent from './EventContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { t, format, withLocale } = useDemoLocale()
const logs = ref<string[]>([])

const addLog = (msg: string) => {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
  if (logs.value.length > 10) logs.value.pop()
}

const openWithCallbacks = () => {
  addLog(t.value.openLayerLog)
  openLayer(
    withLocale({
      title: t.value.eventCallbackDemo,
      content: ContentComponent,
      props: {
        greeting: t.value.fillThenConfirm,
        nameLabel: t.value.nameLabel,
        namePlaceholder: t.value.namePlaceholder,
        emailLabel: t.value.emailLabel,
        emailPlaceholder: t.value.emailPlaceholder
      },
      size: { width: '450px', height: '320px' },
      onOk: (message: any) => {
        addLog(format(t.value.onOkTriggered, { data: JSON.stringify(message) }))
      },
      onCancel: () => {
        addLog(t.value.onCancelTriggered)
      }
    }),
    appContext
  )
}

const openWithCommand = () => {
  addLog(t.value.openLayerLog)
  openLayer(
    withLocale({
      title: t.value.customCommandDemo,
      content: EventContent,
      props: {
        title: t.value.customCommandTitle,
        desc: t.value.customCommandDesc,
        exportText: t.value.exportPdf,
        printText: t.value.print,
        closeText: t.value.close
      },
      size: { width: '450px', height: '300px' },
      footer: false,
      onCommand: (command: any, message: any) => {
        addLog(format(t.value.onCommandLog, { cmd: command, data: JSON.stringify(message) }))
      }
    }),
    appContext
  )
}

const clearLogs = () => {
  logs.value = []
}
</script>

<template>
  <div class="demo-block">
    <div class="demo-block__title">{{ t.eventConfig }}</div>
    <button @click="openWithCallbacks">{{ t.okCancelCallback }}</button>
    <button @click="openWithCommand">{{ t.customCommand }}</button>
    <button @click="clearLogs" class="outline">{{ t.clearLogs }}</button>
    <div
      v-if="logs.length"
      style="
        margin-top: 16px;
        padding: 12px;
        background: var(--vp-c-bg);
        border-radius: 6px;
        font-size: 13px;
        max-height: 200px;
        overflow-y: auto;
      "
    >
      <strong>{{ t.eventLog }}</strong>
      <div
        v-for="(log, i) in logs"
        :key="i"
        style="margin-top: 4px; font-family: monospace; color: var(--vp-c-text-2)"
      >
        {{ log }}
      </div>
    </div>
  </div>
</template>
