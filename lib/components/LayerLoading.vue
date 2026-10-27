<template>
  <div
    v-if="loading"
    class="vll-loading-mask"
    role="status"
    aria-live="polite"
    :aria-label="t('VueLiteLayer.loading')"
  >
    <div class="vll-loading-spinner" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n-lite'
import { useLayerEmitter } from '../core/layer-emitter'

const i18n = useI18n()
const t = i18n?.t ?? ((key: string) => key)
const loading = ref(false)
const emitter = useLayerEmitter()

const handleStart = () => {
  loading.value = true
}
const handleStop = () => {
  loading.value = false
}

onMounted(() => {
  emitter.on('startLoading', handleStart)
  emitter.on('stopLoading', handleStop)
})

onUnmounted(() => {
  emitter.off('startLoading', handleStart)
  emitter.off('stopLoading', handleStop)
})
</script>

<!--
  非 scoped 样式块：防止 Vue 对 @keyframes 名称进行哈希处理
  （Vue 3.3.4+ 会在 <style scoped> 中对 keyframe 名称进行作用域处理，
  可能导致 animation 属性和 @keyframes 声明引用不同的哈希名称，从而导致动画失效）

  Non-scoped style block: prevents Vue from hashing @keyframes name
  (Vue 3.3.4+ scopes keyframe names in <style scoped>, which can cause
  the animation property and @keyframes declaration to reference
  different hashed names, breaking the animation)

  Keyframe 名称加了项目命名空间前缀以避免与宿主或第三方库同名 keyframe
  在全局样式表里发生冲突 / The keyframe name carries a project namespace
  prefix to avoid collisions in the global stylesheet with host or
  third-party libraries that may use the same identifier.
-->
<style>
@keyframes vue-lite-layer-loading-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.vll-loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lite-layer-loading-mask-bg, rgba(255, 255, 255, 0.8));
}

/* 三层圆环同轴旋转 / Three concentric rings rotating on the same axis */
.vll-loading-spinner {
  position: relative;
  box-sizing: border-box;
  width: var(--lite-layer-loading-spinner-size, 36px);
  aspect-ratio: 1;
  border: var(--lite-layer-loading-spinner-border, 3px) solid transparent;
  border-right-color: var(--lite-layer-color-primary, #409eff);
  border-radius: 50%;
  animation: vue-lite-layer-loading-rotate var(--lite-layer-loading-spinner-duration, 0.8s) infinite
    linear;
}

.vll-loading-spinner::before,
.vll-loading-spinner::after {
  content: '';
  position: absolute;
  box-sizing: border-box;
  inset: calc(var(--lite-layer-loading-spinner-border, 3px) * -1);
  border: var(--lite-layer-loading-spinner-border, 3px) solid transparent;
  border-right-color: var(--lite-layer-color-primary, #409eff);
  border-radius: 50%;
  animation: vue-lite-layer-loading-rotate
    calc(var(--lite-layer-loading-spinner-duration, 0.8s) * 2) infinite linear;
}

/* 最外层转得最慢，形成错层效果 / Outermost ring spins slowest for the layered effect */
.vll-loading-spinner::after {
  animation-duration: calc(var(--lite-layer-loading-spinner-duration, 0.8s) * 4);
}
</style>
