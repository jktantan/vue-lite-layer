<template>
  <ElConfigProvider :locale="currentLocale">
  <div class="app">
    <h1>Vue Lite Layer - 打包测试（Nuxt）</h1>
    <p>测试打包后的库在 Nuxt 3 中是否能正常工作</p>

    <div class="host-calendar">
      <h3>宿主日期组件（用于和 Layer 对比）</h3>
      <ElDatePicker
        v-model="hostDate"
        type="date"
        :placeholder="currentLang === 'zh' ? '请选择日期' : 'Pick a date'"
        style="width: 260px"
      />
      <p>当前值：{{ hostDate || '-' }}</p>
    </div>
    
    <div class="button-group">
      <button :class="{ active: currentLang === 'zh' }" @click="currentLang = 'zh'">中文</button>
      <button :class="{ active: currentLang === 'en' }" @click="currentLang = 'en'">English</button>
      <button @click="openBasicLayer">基础弹层</button>
      <button @click="openLayerWithContent">带内容组件的弹层</button>
      <button @click="openTwoLayers">打开两个弹层（测试 z-index）</button>
      <button @click="openDraggableLayer">可拖拽弹层</button>
      <button @click="openElementLayer">Element Plus Layer 测试</button>
    </div>

    <div class="status">
      <h3>测试结果：</h3>
      <ul>
        <li>✅ Nuxt 模块加载成功</li>
        <li>✅ CSS 样式加载成功</li>
        <li>{{ layerTestStatus }}</li>
      </ul>
    </div>
  </div>
  </ElConfigProvider>
</template>

<script setup lang="ts">
import {
  ElButton,
  ElConfigProvider,
  ElDatePicker,
  ElInput,
  ElOption,
  ElPagination,
  ElSelect
} from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/config-provider/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/option/style/css'
import 'element-plus/es/components/pagination/style/css'
import 'element-plus/es/components/select/style/css'

const { openLayer } = useLiteLayer()
const layerTestStatus = ref('⏳ 等待测试弹层功能...')
const currentLang = ref<'zh' | 'en'>('zh')
const currentLocale = computed(() => (currentLang.value === 'zh' ? zhCn : en))
const hostDate = ref('')

const openBasicLayer = () => {
  openLayer({
    title: '基础弹层测试 (Nuxt)',
    content: '这是一个简单的弹层内容，用于测试打包后的库在 Nuxt 中是否正常工作。',
    onOk: () => {
      console.log('确定按钮点击')
      layerTestStatus.value = '✅ 基础弹层功能正常'
    }
  })
}

const openLayerWithContent = () => {
  const CustomContent = defineComponent({
    setup() {
      return () => h('div', { style: 'padding: 20px;' }, [
        h('h3', 'Nuxt 自定义组件内容'),
        h('p', '这是通过组件渲染的内容'),
        h('ul', [
          h('li', '支持 Nuxt 组件'),
          h('li', '支持响应式数据'),
          h('li', '支持自动导入')
        ])
      ])
    }
  })

  openLayer({
    title: '组件内容测试 (Nuxt)',
    content: CustomContent,
    size: { width: '500px', height: '300px' },
    onOk: () => {
      layerTestStatus.value = '✅ 组件内容渲染正常'
    }
  })
}

const openTwoLayers = () => {
  openLayer({
    title: '第一个弹层 (Nuxt)',
    content: '这是第一个弹层，尝试点击打开第二个弹层',
    location: 'LT', // LEFT_TOP
    size: { width: '400px', height: '250px' },
    shade: false
  })

  setTimeout(() => {
    openLayer({
      title: '第二个弹层 (Nuxt)',
      content: '这是第二个弹层。尝试拖拽它们，然后点击下层弹层，测试位置是否会重置。',
      location: 'RB', // RIGHT_BOTTOM
      size: { width: '400px', height: '250px' },
      shade: false,
      onOk: () => {
        layerTestStatus.value = '✅ 多窗口和 z-index 管理正常'
      }
    })
  }, 300)
}

const openDraggableLayer = () => {
  openLayer({
    title: '拖拽测试弹层 (Nuxt)',
    content: '拖拽这个弹层的标题栏来移动它的位置，然后点击确定测试位置是否保持。',
    size: { width: '450px', height: '200px' },
    onOk: () => {
      layerTestStatus.value = '✅ 拖拽和位置保持功能正常'
    }
  })
}

const openElementLayer = () => {
  const isZh = currentLang.value === 'zh'
  const LayerContent = defineComponent({
    name: 'NuxtElementPlusLayerContent',
    setup() {
      const text = ref(isZh ? 'Nuxt Layer 输入' : 'Nuxt Layer input')
      const value = ref('A')
      const date = ref('')
      return () =>
        h('div', { style: 'padding: 16px; display: grid; gap: 12px;' }, [
          h(
            'p',
            { style: 'margin: 0; color: #666;' },
            isZh
              ? 'Layer 内未再次包裹 ConfigProvider'
              : 'This layer component does not wrap ConfigProvider again'
          ),
          h(ElInput, {
            modelValue: text.value,
            'onUpdate:modelValue': (v: string) => (text.value = v),
            placeholder: isZh ? '请输入内容' : 'Please input'
          }),
          h(
            ElSelect,
            {
              modelValue: value.value,
              'onUpdate:modelValue': (v: string) => (value.value = v),
              placeholder: isZh ? '请选择' : 'Please select',
              style: 'width: 220px;'
            },
            () => [
              h(ElOption, { label: isZh ? '选项 A' : 'Option A', value: 'A' }),
              h(ElOption, { label: isZh ? '选项 B' : 'Option B', value: 'B' })
            ]
          ),
          h(ElDatePicker, {
            modelValue: date.value,
            'onUpdate:modelValue': (v: string) => (date.value = v),
            type: 'date',
            placeholder: isZh ? '请选择日期' : 'Pick a date',
            style: 'width: 220px;'
          }),
          h(ElPagination, {
            total: 120,
            pageSize: 10,
            currentPage: 1,
            layout: 'total, prev, pager, next, jumper'
          }),
          h(
            ElButton,
            { type: 'primary' },
            { default: () => (isZh ? '确认按钮（Element Plus）' : 'Confirm (Element Plus)') }
          )
        ])
    }
  })

  openLayer({
    title: isZh ? 'Nuxt + Element Plus Layer 测试' : 'Nuxt + Element Plus Layer Test',
    content: LayerContent,
    size: { width: '640px', height: '420px' },
    onOk: () => {
      layerTestStatus.value = isZh
        ? '✅ Element Plus Layer 测试已打开'
        : '✅ Element Plus Layer test opened'
    }
  })
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
  color: #00dc82;
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
  background-color: #00dc82;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #00bd6f;
}

button:active {
  background-color: #00a05d;
}

button.active {
  border: 1px solid #fff;
  box-shadow: inset 0 0 0 1px #fff;
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
