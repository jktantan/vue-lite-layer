<template>
  <div class="test-container">
    <h2>AppContext 隔离测试</h2>
    
    <div class="test-section">
      <h3>宿主应用状态</h3>
      <p v-if="hostCount && hostUser">
        计数器值：<strong>{{ hostCount.value }}</strong> | 
        用户名：<strong>{{ hostUser.name }}</strong>
      </p>
      <p v-else style="color: red;">
        ❌ 无法从应用级别 inject 数据（检查 main.js）
      </p>
      <button v-if="hostCount" @click="hostCount.value++">宿主增加计数</button>
      <button v-if="hostUser" @click="hostUser.name = 'Host_' + Date.now()">宿主修改用户名</button>
    </div>

    <div class="test-section">
      <h3>测试操作</h3>
      <p v-if="!appContext" style="color: red;">
        ⚠️ appContext 不可用，测试可能无法正常工作
      </p>
      <p v-else style="color: green;">
        ✅ appContext 已就绪
      </p>
      <button @click="testSimple" style="background: #606266; color: white;">
        测试 0：简单弹层（不传 appContext）
      </button>
      <button @click="testProvideIsolation" class="primary">
        测试 1：Layer 中 provide 覆盖
      </button>
      <button @click="testDirectModification" class="warning">
        测试 2：Layer 中直接修改对象
      </button>
      <button @click="testMultipleLayers" class="success">
        测试 3：多个 Layer 互不影响
      </button>
      <button @click="testReadonly" class="info">
        测试 4：使用 readonly 保护
      </button>
    </div>

    <div class="test-section">
      <h3>测试结果</h3>
      <div v-for="(result, index) in testResults" :key="index" 
           :class="['test-result', result.type]">
        <strong>{{ result.title }}</strong>: {{ result.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, provide, readonly, inject, getCurrentInstance, h, type Ref } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { openLayer } = useLiteLayer()
type TestResultType = 'info' | 'success' | 'warning' | 'error'
type TestUser = { name: string }
type ReadonlyUser = Readonly<TestUser>

const testResults = ref<Array<{ title: string; message: string; type: TestResultType; time: string }>>([])

// 获取当前组件的 appContext
const instance = getCurrentInstance()
const appContext = instance?.appContext

// 从应用级别 inject 数据（在 main.ts 中通过 app.provide 添加的）
const hostCount = inject<Ref<number>>('testCount')
const hostUser = inject<TestUser>('testUser')

// 调试信息
console.log('AppContextTest mounted')
console.log('  instance:', !!instance)
console.log('  appContext:', !!appContext)
console.log('  appContext.provides:', appContext?.provides)
console.log('  hostCount:', hostCount)
console.log('  hostUser:', hostUser)

const addResult = (title: string, message: string, type: TestResultType = 'info') => {
  testResults.value.push({ title, message, type, time: new Date().toLocaleTimeString() })
}

// 检查数据是否可用
if (!hostCount || !hostUser) {
  addResult('⚠️ 警告', '无法从应用级别 inject 数据，请检查 main.js', 'warning')
} else {
  addResult('✅ 初始化', `成功 inject 数据: count=${hostCount.value}, user=${hostUser.name}`, 'success')
}

// 测试 0：简单弹层（验证基本功能）
const testSimple = () => {
  console.log('testSimple called')
  addResult('测试 0 开始', '打开简单弹层（不传 appContext）...', 'info')
  
  try {
    const result = openLayer({
      title: '简单测试',
      content: '这是一个简单的测试弹层，用于验证基本功能是否正常。',
      size: { width: '400px', height: '200px' },
      onOk: () => {
        addResult('测试 0 结果', '简单弹层功能正常 ✅', 'success')
      }
    })
    console.log('testSimple openLayer result:', result)
    if (!result) {
      addResult('测试 0 失败', '无法打开 Layer', 'error')
    } else {
      addResult('测试 0 进行中', 'Layer 已打开，请查看并点击确定', 'info')
    }
  } catch (error: any) {
    console.error('testSimple error:', error)
    addResult('测试 0 失败', `错误: ${error.message}`, 'error')
  }
}

// 测试 1：Layer 中 provide 覆盖（应该不影响宿主）
const testProvideIsolation = () => {
  console.log('testProvideIsolation called, appContext:', !!appContext)
  addResult('测试 1 开始', '打开 Layer，尝试 provide 覆盖...', 'info')
  
  if (!appContext) {
    addResult('测试 1 失败', 'appContext 不可用，无法测试', 'error')
    return
  }
  
  const LayerContent = {
    setup() {
      const count = inject<Ref<number>>('testCount')
      const user = inject<TestUser>('testUser')
      
      console.log('Layer setup, injected count:', count?.value, 'user:', user?.name)
      
      // 尝试重新 provide
      provide('testCount', ref(999))
      provide('testUser', reactive({ name: 'Layer User' }))
      
      // 读取新的值
      const newCount = inject<Ref<number>>('testCount')
      const newUser = inject<TestUser>('testUser')
      
      return () => h('div', { style: 'padding: 20px;' }, [
        h('p', `原始 count: ${count?.value ?? 'undefined'}`),
        h('p', `原始 user: ${user?.name ?? 'undefined'}`),
        h('p', `新 provide 的 count: ${newCount?.value ?? 'undefined'}`),
        h('p', `新 provide 的 user: ${newUser?.name ?? 'undefined'}`),
        h('p', { style: 'color: green; font-weight: bold;' }, 
          '✅ Layer 内部可以覆盖 provide，不影响外部')
      ])
    }
  }
  
  try {
    const result = openLayer({
      title: '测试 1：Provide 覆盖',
      content: LayerContent,
      size: { width: '500px', height: '300px' },
      onOk: () => {
      addResult('测试 1 结果', 
        `宿主 count 仍为 ${hostCount?.value}，user 仍为 ${hostUser?.name}`, 
        'success')
      }
    }, appContext)
    console.log('openLayer result:', result)
    if (!result) {
      addResult('测试 1 失败', '无法打开 Layer', 'error')
    }
  } catch (error: any) {
    console.error('openLayer error:', error)
    addResult('测试 1 失败', `错误: ${error.message}`, 'error')
  }
}

// 测试 2：Layer 中直接修改对象（会影响宿主 ⚠️）
const testDirectModification = () => {
  addResult('测试 2 开始', '打开 Layer，尝试直接修改对象...', 'warning')
  
  const beforeCount = hostCount?.value
  const beforeName = hostUser?.name
  
  const LayerContent = {
    setup() {
      const count = inject<Ref<number>>('testCount')
      const user = inject<TestUser>('testUser')
      
      console.log('Test 2 - count:', count, 'user:', user)
      
      // 检查是否成功 inject
      if (!count || !user) {
        return () => h('div', { style: 'padding: 20px; color: red;' }, [
          h('p', '❌ 无法 inject testCount 或 testUser'),
          h('p', `count: ${!!count}, user: ${!!user}`)
        ])
      }
      
      // 直接修改
      count.value += 10
      user.name = 'Modified by Layer'
      
      return () => h('div', { style: 'padding: 20px;' }, [
        h('p', `修改后 count: ${count.value}`),
        h('p', `修改后 user: ${user.name}`),
        h('p', { style: 'color: orange; font-weight: bold;' }, 
          '⚠️ 直接修改会影响宿主（原型链隔离无法防止）')
      ])
    }
  }
  
  openLayer({
    title: '测试 2：直接修改对象',
    content: LayerContent,
    size: { width: '500px', height: '300px' },
    onOk: () => {
      addResult('测试 2 结果', 
        `count 从 ${beforeCount} 变为 ${hostCount?.value}，` +
        `user 从 "${beforeName}" 变为 "${hostUser?.name}"`, 
        'warning')
    }
  }, appContext)
}

// 测试 3：多个 Layer 互不影响
const testMultipleLayers = () => {
  addResult('测试 3 开始', '打开两个 Layer，测试互不影响...', 'info')
  
  const createLayerContent = (label: string, bg: string) => ({
    setup() {
      const layerSpecificRef = ref(`${label} Data`)
      provide('layerSpecific', layerSpecificRef)

      // inject 在同一组件中不会读取到自己 provide 的值，
      // 所以用子组件来验证 layerSpecific 是否可被后代正确注入。
      const Child = {
        setup() {
          const specific = inject<Ref<string>>('layerSpecific')
          const count = inject<Ref<number>>('testCount')

          if (!specific || !count) {
            return () => h('div', { style: 'padding: 20px; color: red;' }, [
              h('p', `❌ ${label} inject 失败`),
              h('p', `specific: ${!!specific}, count: ${!!count}`)
            ])
          }

          return () => h('div', { style: `padding: 20px; background: ${bg};` }, [
            h('h4', label),
            h('p', `${label} 专属数据: ${specific.value}`),
            h('p', `共享 count: ${count.value}`)
          ])
        }
      }

      return () => h(Child)
    }
  })

  const Layer1 = {
    setup() {
      const Content = createLayerContent('Layer 1', '#e3f2fd')
      return () => h(Content)
    }
  }
  
  const Layer2 = {
    setup() {
      const Content = createLayerContent('Layer 2', '#f3e5f5')
      return () => h(Content)
    }
  }
  
  openLayer({
    title: 'Layer 1',
    content: Layer1,
    location: 'LT',
    size: { width: '400px', height: '300px' },
    shade: false
  }, appContext)
  
  setTimeout(() => {
    openLayer({
      title: 'Layer 2',
      content: Layer2,
      location: 'RT',
      size: { width: '400px', height: '300px' },
      shade: false,
      onOk: () => {
        addResult('测试 3 结果', '两个 Layer 的 layerSpecific 互不影响 ✅', 'success')
      }
    }, appContext)
  }, 300)
}

// 测试 4：使用 readonly 保护
const testReadonly = () => {
  addResult('测试 4 开始', '使用 readonly 保护的数据...', 'info')
  
  const LayerContent = {
    setup() {
      const readonlyUser = inject<ReadonlyUser>('testReadonlyUser')
      
      console.log('Test 4 - readonlyUser:', readonlyUser)
      
      if (!readonlyUser) {
        return () => h('div', { style: 'padding: 20px; color: red;' }, [
          h('p', '❌ 无法 inject testReadonlyUser')
        ])
      }
      
      let errorMessage = ''
      try {
        // 尝试修改 readonly 对象
        readonlyUser.name = 'Hacker'
      } catch (e: any) {
        errorMessage = e.message
      }
      
      return () => h('div', { style: 'padding: 20px;' }, [
        h('p', `Readonly user: ${readonlyUser.name}`),
        h('p', { style: 'color: #67c23a;' }, 
          errorMessage ? `修改被阻止: ${errorMessage}` : '✅ 生产模式下通常不抛错，但修改会被忽略（这是预期行为）'),
        h('p', { style: 'color: green; font-weight: bold;' }, 
          '✅ 推荐使用 readonly() 包装可变状态')
      ])
    }
  }
  
  openLayer({
    title: '测试 4：Readonly 保护',
    content: LayerContent,
    size: { width: '500px', height: '300px' },
    onOk: () => {
      addResult('测试 4 结果', 'readonly() 可以有效防止意外修改', 'success')
    }
  }, appContext)
}
</script>

<style scoped>
.test-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h2 {
  color: #409eff;
  border-bottom: 2px solid #409eff;
  padding-bottom: 10px;
}

h3 {
  color: #606266;
  margin-top: 20px;
}

.test-section {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin: 15px 0;
}

button {
  padding: 10px 20px;
  margin: 5px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: white;
  transition: all 0.3s;
}

button.primary {
  background-color: #409eff;
}

button.primary:hover {
  background-color: #66b1ff;
}

button.warning {
  background-color: #e6a23c;
}

button.warning:hover {
  background-color: #ebb563;
}

button.success {
  background-color: #67c23a;
}

button.success:hover {
  background-color: #85ce61;
}

button.info {
  background-color: #909399;
}

button.info:hover {
  background-color: #a6a9ad;
}

.test-result {
  padding: 10px;
  margin: 8px 0;
  border-radius: 4px;
  border-left: 4px solid;
}

.test-result.info {
  background: #ecf5ff;
  border-color: #409eff;
}

.test-result.success {
  background: #f0f9ff;
  border-color: #67c23a;
}

.test-result.warning {
  background: #fdf6ec;
  border-color: #e6a23c;
}

.test-result.error {
  background: #fef0f0;
  border-color: #f56c6c;
}
</style>
