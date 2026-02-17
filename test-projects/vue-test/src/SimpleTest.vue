<template>
  <div style="padding: 20px; background: #f5f5f5; border-radius: 4px;">
    <h3>简化版 AppContext 测试</h3>
    <p v-if="count">宿主计数: <strong>{{ count.value }}</strong></p>
    <p v-else style="color: red;">❌ 无法 inject testData</p>
    <button @click="testWithAppContext" style="padding: 10px 20px; background: #409eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
      使用 appContext 打开 Layer
    </button>
    <button @click="testWithoutAppContext" style="padding: 10px 20px; margin-left: 10px; background: #67c23a; color: white; border: none; border-radius: 4px; cursor: pointer;">
      不使用 appContext 打开 Layer
    </button>
    <div v-if="result" style="margin-top: 20px; padding: 15px; background: white; border-radius: 4px;">
      <h4>测试结果:</h4>
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, getCurrentInstance, h, type Ref } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { openLayer } = useLiteLayer()
const result = ref('')
const instance = getCurrentInstance()
const appContext = instance?.appContext

// 从应用级别 inject 数据（在 main.ts 中 app.provide 添加的）
const count = inject<Ref<number>>('testData')

console.log('SimpleTest - instance:', instance)
console.log('SimpleTest - appContext:', appContext)
console.log('SimpleTest - appContext.provides:', appContext?.provides)
console.log('SimpleTest - injected count:', count)

const testWithAppContext = () => {
  result.value = '正在打开...'
  console.log('testWithAppContext - appContext:', appContext)
  
  const LayerContent = {
    setup() {
      console.log('Layer setup started')
      const injected = inject<Ref<number>>('testData')
      console.log('Layer injected testData:', injected)
      
      return () => h('div', { style: 'padding: 20px;' }, [
        h('h4', '使用 appContext 的 Layer'),
        h('p', injected 
          ? `成功 inject: ${injected.value}` 
          : '❌ inject 失败'),
        h('p', { style: 'color: green;' }, 
          injected ? '✅ appContext 传递成功' : '❌ appContext 传递失败')
      ])
    }
  }
  
  try {
    const layerResult = openLayer({
      title: '测试（带 appContext）',
      content: LayerContent,
      size: { width: '400px', height: '250px' },
      onOk: () => {
        result.value = 'Layer 成功打开并关闭'
      }
    }, appContext)
    
    console.log('openLayer result:', layerResult)
    
    if (layerResult) {
      result.value = 'Layer 已打开，传递了 appContext'
    } else {
      result.value = '❌ openLayer 返回 null'
    }
  } catch (error: any) {
    console.error('Error:', error)
    result.value = `错误: ${error.message}`
  }
}

const testWithoutAppContext = () => {
  result.value = '正在打开...'
  
  const LayerContent = {
    setup() {
      const injected = inject<Ref<number>>('testData')
      console.log('Layer (no context) injected:', injected)
      
      return () => h('div', { style: 'padding: 20px;' }, [
        h('h4', '不使用 appContext 的 Layer'),
        h('p', injected 
          ? `意外成功 inject: ${injected.value}` 
          : '❌ inject 失败（预期行为）'),
        h('p', { style: 'color: orange;' }, 
          '未传递 appContext，无法访问宿主的 provides')
      ])
    }
  }
  
  try {
    const layerResult = openLayer({
      title: '测试（不带 appContext）',
      content: LayerContent,
      size: { width: '400px', height: '250px' },
      onOk: () => {
        result.value = 'Layer 成功打开并关闭（未传 appContext）'
      }
    })
    
    if (layerResult) {
      result.value = 'Layer 已打开，未传递 appContext'
    } else {
      result.value = '❌ openLayer 返回 null'
    }
  } catch (error: any) {
    result.value = `错误: ${error.message}`
  }
}
</script>
