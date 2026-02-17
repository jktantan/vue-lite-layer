<template>
  <div v-if="loading" class="vll-loading-mask">
    <div class="vll-loading-spinner" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useLayerEmitter } from '../core/layer-emitter'

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
  Non-scoped style block: prevents Vue from hashing @keyframes name
  (Vue 3.3.4+ scopes keyframe names in <style scoped>, which can cause
  the animation property and @keyframes declaration to reference
  different hashed names, breaking the animation)
-->
<style>
@keyframes vll-loading-rotate {
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
  background: rgba(255, 255, 255, 0.8);
}

.vll-loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e5e6eb;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: vll-loading-rotate 0.8s linear infinite;
}
</style>
