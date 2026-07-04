<template>
  <div
    ref="el"
    class="lite-layer__window-header"
    :class="{ 'lite-layer__disabled-point-event': isMaximized }"
    @dblclick="handleDoubleClick"
  >
    <div :id="titleId" ref="layerTitle" class="lite-layer__window-header-title" :title="title">
      {{ title }}
    </div>

    <div class="lite-layer__window-header-operator" @mousedown.stop>
      <button
        v-if="max && !isMaximized"
        type="button"
        class="lite-layer__mask-button lite-layer__icon-maximum"
        :title="t('VueLiteLayer.maximum')"
        :aria-label="t('VueLiteLayer.maximum')"
        @click="handleMaximize"
      />
      <button
        v-if="isMaximized"
        type="button"
        class="lite-layer__mask-button lite-layer__icon-restore"
        :title="t('VueLiteLayer.restore')"
        :aria-label="t('VueLiteLayer.restore')"
        @click="handleRestore"
      />
      <button
        v-if="close"
        type="button"
        class="lite-layer__mask-button lite-layer__icon-close"
        :title="t('VueLiteLayer.close')"
        :aria-label="t('VueLiteLayer.close')"
        @click="handleClose"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useLayerEmitter } from '../core/layer-emitter'
import { useI18n } from 'vue-i18n-lite'

const i18n = useI18n()
const t = i18n?.t ?? ((key: string) => key)
const el = ref<HTMLElement>()
const emitter = useLayerEmitter()
const isMaximized = ref(false)

const props = withDefaults(
  defineProps<{
    /** 弹层标题文字 / Layer title text */
    title?: string
    /** 标题元素 id，用于 aria-labelledby / Title element id for aria-labelledby */
    titleId?: string
    /** 是否允许最大化 / Whether maximization is allowed */
    max?: boolean
    /** 是否显示关闭按钮 / Whether to show close button */
    close?: boolean
  }>(),
  {
    title: '',
    titleId: undefined,
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
