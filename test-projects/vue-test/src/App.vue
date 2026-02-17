<template>
  <el-config-provider :locale="currentLocale">
  <div class="app">
    <h1>Vue Lite Layer - 打包测试（纯 Vue）</h1>
    <p>测试打包后的库是否能正常工作</p>

    <div class="locale-switch">
      <span>Element Plus 语言：</span>
      <button :class="{ active: currentLang === 'zh' }" @click="currentLang = 'zh'">中文</button>
      <button :class="{ active: currentLang === 'en' }" @click="currentLang = 'en'">English</button>
    </div>

    <div class="host-calendar">
      <h3>宿主日期组件（用于和 Layer 对比）</h3>
      <el-date-picker
        v-model="hostDate"
        type="date"
        :placeholder="currentLang === 'zh' ? '请选择日期' : 'Pick a date'"
        style="width: 260px"
      />
      <p>当前值：{{ hostDate || '-' }}</p>
    </div>
    
    <div class="tabs">
      <button 
        :class="{ active: currentTab === 'basic' }" 
        @click="currentTab = 'basic'">
        基础功能测试
      </button>
      <button 
        :class="{ active: currentTab === 'appcontext' }" 
        @click="currentTab = 'appcontext'">
        AppContext 隔离测试
      </button>
    </div>

    <div v-show="currentTab === 'basic'">
      <div class="button-group">
        <button @click="openBasicLayer">基础弹层</button>
        <button @click="openLayerWithContent">带内容组件的弹层</button>
        <button @click="openTwoLayers">打开两个弹层（测试 z-index）</button>
        <button @click="openDraggableLayer">可拖拽弹层</button>
      </div>

      <div class="status">
        <h3>测试结果：</h3>
        <ul>
          <li>✅ 库导入成功</li>
          <li>✅ CSS 样式加载成功</li>
          <li id="layer-test">⏳ 等待测试弹层功能...</li>
        </ul>
      </div>
    </div>

    <div v-show="currentTab === 'appcontext'">
      <PrototypeTest />
      <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;">
      <SimpleTest />
      <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;">
      <AppContextTest />
      <ElementPlusLayerTest :lang="currentLang" />
    </div>
  </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, h } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import { ElConfigProvider, ElDatePicker } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import 'element-plus/es/components/date-picker/style/css'
import PrototypeTest from './PrototypeTest.vue'
import SimpleTest from './SimpleTest.vue'
import AppContextTest from './AppContextTest.vue'
import ElementPlusLayerTest from './ElementPlusLayerTest.vue'

const { openLayer } = useLiteLayer()
const currentTab = ref('basic')
const currentLang = ref<'zh' | 'en'>('zh')
const currentLocale = computed(() => (currentLang.value === 'zh' ? zhCn : en))
const hostDate = ref('')

// 注意：测试数据已在 main.js 中通过 app.provide() 提供
// 组件级的 provide() 不会出现在 appContext.provides 中

const openBasicLayer = () => {
  openLayer({
    title: '基础弹层测试',
    content: '这是一个简单的弹层内容，用于测试打包后的库是否正常工作。',
    onOk: () => {
      console.log('确定按钮点击')
      updateStatus('✅ 基础弹层功能正常')
    }
  })
}

const openLayerWithContent = () => {
  const CustomContent = {
    setup() {
      return () => h('div', { style: 'padding: 20px;' }, [
        h('h3', '自定义组件内容'),
        h('p', '这是通过组件渲染的内容'),
        h('ul', [
          h('li', '支持 Vue 组件'),
          h('li', '支持响应式数据'),
          h('li', '支持事件处理')
        ])
      ])
    }
  }

  openLayer({
    title: '组件内容测试',
    content: CustomContent,
    size: { width: '500px', height: '300px' },
    onOk: () => {
      updateStatus('✅ 组件内容渲染正常')
    }
  })
}

const openTwoLayers = () => {
  openLayer({
    title: '第一个弹层',
    content: '这是第一个弹层，尝试点击打开第二个弹层',
    location: 'LT' as any, // LEFT_TOP
    size: { width: '400px', height: '250px' },
    shade: false
  })

  setTimeout(() => {
    openLayer({
      title: '第二个弹层',
      content: '这是第二个弹层。尝试拖拽它们，然后点击下层弹层，测试位置是否会重置。',
      location: 'RB' as any, // RIGHT_BOTTOM
      size: { width: '400px', height: '250px' },
      shade: false,
      onOk: () => {
        updateStatus('✅ 多窗口和 z-index 管理正常')
      }
    })
  }, 300)
}

const openDraggableLayer = () => {
  openLayer({
    title: '拖拽测试弹层',
    content: '拖拽这个弹层的标题栏来移动它的位置，然后点击确定测试位置是否保持。',
    size: { width: '450px', height: '200px' },
    onOk: () => {
      updateStatus('✅ 拖拽和位置保持功能正常')
    }
  })
}

const updateStatus = (message: string) => {
  const el = document.getElementById('layer-test')
  if (el) {
    el.textContent = message
  }
}
</script>

<style scoped>
.app {
  max-width: 800px;
  margin: 50px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #409eff;
  margin-bottom: 10px;
}

p {
  color: #666;
  margin-bottom: 30px;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 30px;
}

button {
  padding: 10px 20px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #66b1ff;
}

button:active {
  background-color: #3a8ee6;
}

.status {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.status h3 {
  margin-top: 0;
  color: #303133;
}

.status ul {
  list-style: none;
  padding: 0;
}

.status li {
  padding: 5px 0;
  color: #606266;
}

.tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
  border-bottom: 2px solid #dcdfe6;
}

.tabs button {
  padding: 10px 20px;
  background: transparent;
  color: #606266;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all 0.3s;
}

.tabs button:hover {
  color: #409eff;
}

.tabs button.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: bold;
}

.locale-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.locale-switch button {
  background: #f2f6fc;
  color: #606266;
  border: 1px solid #dcdfe6;
  padding: 6px 10px;
}

.locale-switch button.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.host-calendar {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fafafa;
}

.host-calendar h3 {
  margin: 0 0 8px;
  color: #303133;
}

.host-calendar p {
  margin: 10px 0 0;
  color: #606266;
}
</style>
