<script setup lang="ts">
import useLayerEvent from '../../lib/composables/use-layer-event'
import { useDemoLocale } from '../composables/use-demo-locale'

const { t } = useDemoLocale()

const { emitOk, emitCancel, emitCommand, close } = useLayerEvent()

const handleSave = () => {
  emitOk()
  close()
}

const handleSaveDraft = () => {
  emitCommand('draft')
  close()
}

const handleCancel = () => {
  emitCancel()
  close()
}
</script>

<template>
  <div
    style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid #f0f0f0;
    "
  >
    <span style="font-size: 12px; color: #909399">{{ t.customFooterArea }}</span>
    <div style="display: flex; gap: 8px">
      <button
        style="
          padding: 6px 16px;
          border: 1px solid #dcdfe6;
          background: #fff;
          color: #606266;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        "
        @click="handleCancel"
      >
        {{ t.cancel }}
      </button>
      <button
        style="
          padding: 6px 16px;
          border: 1px solid #e6a23c;
          background: #e6a23c;
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        "
        @click="handleSaveDraft"
      >
        {{ t.saveDraft }}
      </button>
      <button
        style="
          padding: 6px 16px;
          border: 1px solid #409eff;
          background: #409eff;
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        "
        @click="handleSave"
      >
        {{ t.saveSubmit }}
      </button>
    </div>
  </div>
</template>
