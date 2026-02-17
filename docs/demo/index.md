# 交互演示

在此页面可以直接体验 Vue Lite Layer 的各种功能。点击按钮即可打开弹层，所有弹层都支持拖拽移动和标题栏双击最大化。

<script setup>
import BasicDemo from '../components/BasicDemo.vue'
import SizeDemo from '../components/SizeDemo.vue'
import PositionDemo from '../components/PositionDemo.vue'
import ShadeDemo from '../components/ShadeDemo.vue'
import FooterDemo from '../components/FooterDemo.vue'
import EventDemo from '../components/EventDemo.vue'
import LoadingDemo from '../components/LoadingDemo.vue'
import MultiLayerDemo from '../components/MultiLayerDemo.vue'
import InstanceDemo from '../components/InstanceDemo.vue'
</script>

## 基础用法

最简单的使用方式，通过 `openLayer` 打开弹层。支持文本内容和 Vue 组件作为内容。

<BasicDemo />

::: details 查看代码
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import MyComponent from './MyComponent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// 组件弹层，通过 props 传参，通过 onOk 接收返回数据
openLayer({
  title: '组件内容弹层',
  content: MyComponent,
  props: { greeting: '请填写您的信息' },
  size: { width: '450px', height: '320px' },
  onOk: (message) => {
    console.log('返回数据:', message)
  }
}, appContext)
```
:::

## 遮罩层配置

通过 `shade` 控制是否显示遮罩，通过 `shadeClose` 控制点击遮罩是否关闭弹层。

<ShadeDemo />

::: details 查看代码
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// 有遮罩，点击可关闭（默认行为）
openLayer({
  title: '点击遮罩可关闭',
  content: MyComponent,
  shade: true,       // 默认 true
  shadeClose: true,  // 默认 true
}, appContext)

// 有遮罩，点击不可关闭
openLayer({
  title: '点击遮罩不关闭',
  content: MyComponent,
  shade: true,
  shadeClose: false,  // 只能通过关闭按钮关闭
}, appContext)

// 无遮罩
openLayer({
  title: '无遮罩',
  content: MyComponent,
  shade: false,  // 无遮罩层，页面可交互
}, appContext)
```
:::

## 底部按钮区 (footer)

通过 `footer` 配置底部按钮区域：`true` 显示默认按钮，`false` 隐藏，传入 Vue 组件实现完全自定义。

<FooterDemo />

::: details 查看代码
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import CustomFooter from './CustomFooter.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// 默认底部按钮
openLayer({
  title: '默认按钮',
  content: MyComponent,
  footer: true, // 默认值，显示 确认/取消 按钮
}, appContext)

// 隐藏底部按钮
openLayer({
  title: '隐藏按钮',
  content: MyComponent,
  footer: false,
}, appContext)

// 自定义底部组件
openLayer({
  title: '自定义底部',
  content: MyComponent,
  footer: CustomFooter,  // 传入 Vue 组件替换默认按钮区
}, appContext)
```

自定义底部组件示例（使用 Footer 专用 API）：

```vue
<!-- CustomFooter.vue -->
<script setup>
import { useLayerEvent } from 'vue-lite-layer'

// Footer 专用：emitOk / emitCancel / emitCommand
const { emitOk, emitCancel, emitCommand, close } = useLayerEvent()

const handleSave = () => {
  emitOk()              // 通知 Container：确认
  close()
}

const handleSaveDraft = () => {
  emitCommand('draft')  // 发送自定义命令
  close()
}

const handleCancel = () => {
  emitCancel()           // 通知 Container：取消
  close()
}
</script>

<template>
  <div class="custom-footer">
    <button @click="handleCancel">取消</button>
    <button @click="handleSaveDraft">存为草稿</button>
    <button @click="handleSave">保存并提交</button>
  </div>
</template>
```
:::

## 自定义尺寸

通过 `size` 属性设置弹层尺寸，支持像素值和百分比。通过 `maxWidth` / `maxHeight` 限制最大尺寸。

<SizeDemo />

::: details 查看代码
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// 固定像素尺寸
openLayer({
  title: '小型弹层',
  size: { width: '250px', height: '180px' },
}, appContext)

// 百分比尺寸
openLayer({
  title: '大型弹层',
  size: { width: '80%', height: '70%' },
}, appContext)

// 限制最大尺寸
openLayer({
  title: '限制最大尺寸',
  size: { width: '90%', height: '80%' },
  maxWidth: '600px',
  maxHeight: '400px',
}, appContext)
```
:::

## 定位方式

通过 `location` 属性设置弹层位置，支持 9 种预设位置和自定义坐标。

<PositionDemo />

::: details 查看代码
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// 预设位置：左上角
openLayer({
  title: '左上角',
  location: 'LT',
  shade: false,
}, appContext)

// 预设位置：居中（默认）
openLayer({
  title: '居中',
  location: 'CC',
}, appContext)

// 自定义坐标
openLayer({
  title: '自定义坐标',
  location: { top: '50px', left: '100px' },
  shade: false,
}, appContext)
```
:::

## 事件交互

通过 `onOk` / `onCancel` / `onCommand` 回调接收弹层内组件的交互结果。

<EventDemo />

::: details 查看代码
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import FormContent from './FormContent.vue'
import CommandContent from './CommandContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// 确认/取消回调
openLayer({
  title: '事件回调',
  content: FormContent,
  onOk: (message) => console.log('确认:', message),
  onCancel: () => console.log('取消'),
}, appContext)

// 自定义命令
openLayer({
  title: '自定义命令',
  content: CommandContent,
  footer: false,
  onCommand: (command, message) => {
    console.log('命令:', command, '数据:', message)
  },
}, appContext)
```
:::

## 加载状态

弹层内容组件可以通过 `useLayerEvent` 控制加载遮罩的显示和隐藏。

<LoadingDemo />

::: details 查看代码
```vue
<!-- 弹层内容组件 -->
<script setup>
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, startLoading, stopLoading, resolveOk, close } = useLayerEvent()

onOk(async () => {
  startLoading()
  try {
    const result = await saveData() // 异步操作
    resolveOk(result)
    close()
  } finally {
    stopLoading()
  }
})
```
:::

## 实例方法控制

`openLayer` 返回弹层实例对象，可以从外部控制弹层的最大化、还原和关闭。

<InstanceDemo />

::: details 查看代码
```vue
<script setup>
import { ref, getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

const instance = ref(null)

// 打开并保存实例引用
instance.value = openLayer({
  title: '可控弹层',
  shade: false,
  footer: false,
}, appContext)

// 外部控制
instance.value?.maximize()   // 最大化
instance.value?.restore()    // 还原
instance.value?.bringToTop() // 置顶
instance.value?.close()      // 关闭
```
:::

## 多弹层管理

支持同时打开多个弹层，内置 z-index 自动管理。`uniqueGroup` 可防止同组弹层重复打开。

<MultiLayerDemo />

::: details 查看代码
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer, closeAllLayer } = useLiteLayer()

// 打开多个无遮罩弹层，点击窗体自动置顶
openLayer({
  title: '弹层 1',
  shade: false,
  location: { top: '100px', left: '300px' },
}, appContext)

// 唯一分组：同组只能打开一个
const instance = openLayer({
  title: '设置',
  uniqueGroup: 'settings',
  shade: false,
}, appContext)

// 再次打开同组弹层会返回 null
const instance2 = openLayer({
  title: '设置',
  uniqueGroup: 'settings',
  shade: false,
}, appContext)
console.log(instance2) // null — 同组弹层已存在

// 关闭所有弹层
closeAllLayer()
```
:::
