<script setup lang="ts">
import useLayerEvent from '../../lib/composables/use-layer-event'

const props = withDefaults(
  defineProps<{
    title?: string
    desc?: string
    exportText?: string
    printText?: string
    closeText?: string
  }>(),
  {
    title: 'Custom Commands',
    desc: 'Click buttons to send different commands:',
    exportText: 'Export PDF',
    printText: 'Print',
    closeText: 'Close'
  }
)

const { resolveCommand, close } = useLayerEvent()

const handleExport = () => {
  resolveCommand('export', { format: 'PDF', pages: 'all' })
}

const handlePrint = () => {
  resolveCommand('print', { copies: 1 })
}

const handleClose = () => {
  close()
}
</script>

<template>
  <div class="demo-content">
    <h3>{{ title }}</h3>
    <p>{{ desc }}</p>
    <div style="display: flex; gap: 8px; margin-top: 16px">
      <button
        style="
          padding: 6px 16px;
          border: 1px solid #409eff;
          background: #409eff;
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
        "
        @click="handleExport"
      >
        {{ exportText }}
      </button>
      <button
        style="
          padding: 6px 16px;
          border: 1px solid #67c23a;
          background: #67c23a;
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
        "
        @click="handlePrint"
      >
        {{ printText }}
      </button>
      <button
        style="
          padding: 6px 16px;
          border: 1px solid #dcdfe6;
          background: #fff;
          color: #606266;
          border-radius: 4px;
          cursor: pointer;
        "
        @click="handleClose"
      >
        {{ closeText }}
      </button>
    </div>
  </div>
</template>
