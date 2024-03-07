<template>
  <div v-if="loading" class="Layer-loading-mask">
    <div class="vll-loading--spin turn" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useEmitter } from '../utils/layerMitt'
const loading = ref<boolean>(false)

useEmitter().on('startLoading', () => {
  loading.value = true
})
useEmitter().on('stopLoading', () => {
  loading.value = false
})
</script>
<style scoped>
.Layer-loading-mask {
  width: 100%;
  height: 100%;
  position: absolute;
  display: flex;
  background: white;
  opacity: 0.8;
  align-items: center;
  justify-content: center;
}
.vll-loading--spin {
  align-self: center;
  z-index: auto;
  width: 36px;
  height: 36px;
  background: url('../assets/image/loading.svg');
  background-size: contain;
  animation: turn 1.5s linear infinite;
}

/*
      turn : 定义的动画名称
      1s : 动画时间
      linear : 动画以何种运行轨迹完成一个周期
      infinite :规定动画应该无限次播放
     */
@keyframes turn {
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(90deg);
  }
  50% {
    transform: rotate(180deg);
  }
  75% {
    transform: rotate(270deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
