<template>
  <div style="padding: 20px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 4px;">
    <h3>🔬 原型链诊断</h3>
    <p>测试 Vue inject 是否支持原型链查找</p>
    <button @click="runTest" style="padding: 10px 20px; background: #ffc107; border: none; border-radius: 4px; cursor: pointer;">
      运行诊断
    </button>
    <pre v-if="result" style="margin-top: 15px; padding: 15px; background: white; border-radius: 4px; overflow: auto;">{{ result }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const result = ref('')

const runTest = () => {
  const output: string[] = []
  
  output.push('=== 原型链测试 ===\n')
  
  // 模拟宿主的 provides
  const hostProvides: Record<string, { value: string }> = {
    testKey: { value: 'host value' }
  }
  
  // 方法 1：使用 Object.create（当前实现）
  const layerProvides1 = Object.create(hostProvides)
  output.push('方法 1: Object.create(hostProvides)')
  output.push(`  layerProvides1.testKey: ${layerProvides1.testKey?.value}`)
  output.push(`  'testKey' in layerProvides1: ${'testKey' in layerProvides1}`)
  output.push(`  layerProvides1.hasOwnProperty('testKey'): ${layerProvides1.hasOwnProperty('testKey')}`)
  output.push(`  Object.keys(layerProvides1): [${Object.keys(layerProvides1)}]`)
  output.push(`  原型链访问: ${layerProvides1.testKey ? '✅ 成功' : '❌ 失败'}`)
  output.push(`  hasOwnProperty: ${layerProvides1.hasOwnProperty('testKey') ? '✅ 是自有属性' : '⚠️ 不是自有属性'}\n`)
  
  // Vue 的 inject 可能使用 hasOwnProperty 检查
  output.push('Vue inject 可能的实现方式:')
  output.push(`  if (provides.hasOwnProperty(key)): ${layerProvides1.hasOwnProperty('testKey') ? '能找到' : '❌ 找不到'}`)
  output.push(`  if (key in provides): ${'testKey' in layerProvides1 ? '能找到' : '找不到'}`)
  output.push(`  直接访问 provides[key]: ${layerProvides1['testKey'] ? '能找到' : '找不到'}\n`)
  
  // 方法 2：浅拷贝（替代方案）
  const layerProvides2 = { ...hostProvides }
  output.push('方法 2: { ...hostProvides } (浅拷贝)')
  output.push(`  layerProvides2.testKey: ${layerProvides2.testKey?.value}`)
  output.push(`  layerProvides2.hasOwnProperty('testKey'): ${layerProvides2.hasOwnProperty('testKey')}`)
  output.push(`  Object.keys(layerProvides2): [${Object.keys(layerProvides2)}]`)
  output.push(`  hasOwnProperty: ${layerProvides2.hasOwnProperty('testKey') ? '✅ 是自有属性' : '不是自有属性'}\n`)
  
  // 方法 3：Object.assign
  const layerProvides3 = Object.assign({}, hostProvides)
  output.push('方法 3: Object.assign({}, hostProvides)')
  output.push(`  layerProvides3.testKey: ${layerProvides3.testKey?.value}`)
  output.push(`  layerProvides3.hasOwnProperty('testKey'): ${layerProvides3.hasOwnProperty('testKey')}\n`)
  
  // 测试覆盖行为
  output.push('=== 覆盖测试 ===\n')
  
  ;(layerProvides1 as Record<string, { value: string }>).newKey = { value: 'layer only' }
  output.push('方法 1 - 添加 newKey:')
  output.push(`  hostProvides.newKey: ${hostProvides.newKey?.value || 'undefined'} ${!hostProvides.newKey ? '✅ 宿主未受影响' : '❌ 宿主被修改'}`)
  output.push(`  layerProvides1.newKey: ${(layerProvides1 as Record<string, { value: string }>).newKey?.value} ✅\n`)
  
  ;(layerProvides2 as Record<string, { value: string }>).newKey = { value: 'layer only' }
  output.push('方法 2 - 添加 newKey:')
  output.push(`  hostProvides.newKey: ${hostProvides.newKey?.value || 'undefined'} ${!hostProvides.newKey ? '✅ 宿主未受影响' : '❌ 宿主被修改'}`)
  output.push(`  layerProvides2.newKey: ${(layerProvides2 as Record<string, { value: string }>).newKey?.value} ✅\n`)
  
  // 结论
  output.push('=== 结论 ===')
  output.push('如果 Vue inject 使用 hasOwnProperty:')
  output.push('  - Object.create 方法会失败 ❌')
  output.push('  - 浅拷贝方法会成功 ✅')
  output.push('\n推荐解决方案: 使用浅拷贝代替 Object.create')
  
  result.value = output.join('\n')
  console.log(result.value)
}
</script>
