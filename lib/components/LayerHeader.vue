<template>
  <div
    ref="el"
    class="lite-layer__window-header"
    :class="{ 'lite-layer__disabled-point-event': isMax }"
    @dblclick="
      () => {
        if (max) {
          isMax ? onRestore() : onMaximum()
        }
      }
    "
  >
    <div ref="layerTitle" class="lite-layer__window-header-title" :title="title">
      {{ title }}
    </div>

    <div class="lite-layer__window-header-operator" @mousedown.stop>
      <div
        v-if="false"
        class="lite-layer__mask-button lite-layer__icon-minimum"
        :title="t('VueLiteLayer.minimum')"
        @click="onMaximum"
      />
      <div
        v-if="max && !isMax"
        class="lite-layer__mask-button lite-layer__icon-maximum"
        :title="t('VueLiteLayer.maximum')"
        @click="onMaximum"
      />
      <div
        v-if="isMax"
        class="lite-layer__mask-button lite-layer__icon-restore"
        :title="t('VueLiteLayer.maximum')"
        @click="onRestore"
      />
      <div
        v-if="close"
        class="lite-layer__mask-button lite-layer__icon-close"
        :title="t('VueLiteLayer.close')"
        @click="onClose"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
// import localeI18n from '../i18n'
import { useEmitter } from '../utils/layerMitt'
import { useI18n } from 'vue-i18n-lite'
// const { t } = localeI18n().getI18n()
const { t } = useI18n()
const el = ref<HTMLElement>()
const emitter = useEmitter()
const isMax = ref<boolean>(false)
withDefaults(
  defineProps<{
    title?: string
    max?: boolean
    close?: boolean
  }>(),
  {
    title: '',
    max: true,
    close: true
  }
)

/**
 * 最大化
 */
const onMaximum = () => {
  emitter.emit('maximum')
}
/**
 * 关闭
 */
const onClose = () => {
  emitter.emit('close')
}
/**
 * 还原
 */
const onRestore = () => {
  emitter.emit('restore')
}
onMounted(() => {
  emitter.on('maximum', () => {
    isMax.value = true
  })
  emitter.on('restore', () => {
    isMax.value = false
  })
})

defineExpose({ el })
</script>
