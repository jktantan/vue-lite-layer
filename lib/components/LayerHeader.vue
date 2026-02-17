<template>
  <div
    ref="el"
    class="lite-layer__window-header"
    :class="{ 'lite-layer__disabled-point-event': isMaximized }"
    @dblclick="handleDoubleClick"
  >
    <!-- 弹层标题 / Layer Title -->
    <div ref="layerTitle" class="lite-layer__window-header-title" :title="title">
      {{ title }}
    </div>

    <!-- 窗口操作按钮区 / Window Control Buttons -->
    <div class="lite-layer__window-header-operator" @mousedown.stop>
      <div
        v-if="max && !isMaximized"
        class="lite-layer__mask-button lite-layer__icon-maximum"
        :title="t('VueLiteLayer.maximum')"
        @click="handleMaximize"
      />
      <div
        v-if="isMaximized"
        class="lite-layer__mask-button lite-layer__icon-restore"
        :title="t('VueLiteLayer.restore')"
        @click="handleRestore"
      />
      <div
        v-if="close"
        class="lite-layer__mask-button lite-layer__icon-close"
        :title="t('VueLiteLayer.close')"
        @click="handleClose"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useLayerEmitter } from '../core/layer-emitter'
import { useI18n } from 'vue-i18n-lite'

const { t } = useI18n()
const el = ref<HTMLElement>()
const emitter = useLayerEmitter()
const isMaximized = ref(false)

const props = withDefaults(
  defineProps<{
    /** 弹层标题文字 / Layer title text */
    title?: string
    /** 是否允许最大化 / Whether maximization is allowed */
    max?: boolean
    /** 是否显示关闭按钮 / Whether to show close button */
    close?: boolean
  }>(),
  {
    title: '',
    max: true,
    close: true
  }
)

/** 双击标题栏切换最大化/还原 / Double-click header to toggle maximize/restore */
const handleDoubleClick = () => {
  if (props.max) {
    isMaximized.value ? handleRestore() : handleMaximize()
  }
}

const handleMaximize = () => {
  emitter.emit('maximum')
}

const handleClose = () => {
  emitter.emit('close')
}

const handleRestore = () => {
  emitter.emit('restore')
}

/** 响应外部最大化事件（同步内部状态） / Respond to external maximize event (sync internal state) */
const onMaximized = () => {
  isMaximized.value = true
}

/** 响应外部还原事件（同步内部状态） / Respond to external restore event (sync internal state) */
const onRestored = () => {
  isMaximized.value = false
}

onMounted(() => {
  emitter.on('maximum', onMaximized)
  emitter.on('restore', onRestored)
})

onUnmounted(() => {
  emitter.off('maximum', onMaximized)
  emitter.off('restore', onRestored)
})

defineExpose({ el })
</script>
