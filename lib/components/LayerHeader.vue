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

    <div class="lite-layer__window-header-operator" @mousedown.stop @dblclick.stop>
      <button
        v-if="min && !isMinimized"
        type="button"
        class="lite-layer__mask-button lite-layer__icon-minimum"
        :title="t('VueLiteLayer.minimum')"
        :aria-label="t('VueLiteLayer.minimum')"
        @click="handleMinimize"
      />
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
import { ref } from 'vue'
import { useLayerEmitter } from '../core/layer-emitter'
import { useI18n } from 'vue-i18n-lite'

const i18n = useI18n()
const t = i18n?.t ?? ((key: string) => key)
const el = ref<HTMLElement>()
const emitter = useLayerEmitter()

const props = withDefaults(
  defineProps<{
    /** 弹层标题文字 / Layer title text */
    title?: string
    /** 标题元素 id，用于 aria-labelledby / Title element id for aria-labelledby */
    titleId?: string
    /** 是否允许最大化 / Whether maximization is allowed */
    max?: boolean
    /** 是否允许最小化 / Whether minimization is allowed */
    min?: boolean
    /** 当前是否最大化 / Whether the window is maximized */
    isMaximized?: boolean
    /** 当前是否最小化 / Whether the window is minimized */
    isMinimized?: boolean
    /** 是否显示关闭按钮 / Whether to show close button */
    close?: boolean
  }>(),
  {
    title: '',
    titleId: undefined,
    max: true,
    min: false,
    isMaximized: false,
    isMinimized: false,
    close: true
  }
)

/** 双击标题栏切换最大化/还原 / Double-click header to toggle maximize/restore */
const handleDoubleClick = () => {
  if (props.max) {
    props.isMaximized ? handleRestore() : handleMaximize()
  }
}

const handleMaximize = () => {
  emitter.emit('maximum')
}

const handleMinimize = () => {
  emitter.emit('minimize')
}

const handleClose = () => {
  emitter.emit('requestClose', { reason: 'header' })
}

const handleRestore = () => {
  emitter.emit('restore')
}

defineExpose({ el })
</script>
