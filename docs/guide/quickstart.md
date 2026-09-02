# 快速上手

## 注册插件

在应用入口文件中注册 Vue Lite Layer 插件：

```typescript
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import VueLiteLayer from 'vue-lite-layer'
import 'vue-lite-layer/dist/vue-lite-layer.css'

const app = createApp(App)
app.use(VueLiteLayer)
app.mount('#app')
```

你也可以在注册时传入全局默认配置：

```typescript
app.use(VueLiteLayer, {
  shade: true,
  shadeClose: true,
  size: { width: '500px', height: '400px' },
  location: 'CC', // 居中显示
  max: true,       // 允许最大化
  close: true,     // 显示关闭按钮
})
```

## 打开第一个弹层

在任意组件中使用 `useLiteLayer` composable 打开弹层：

```vue
<script setup lang="ts">
import { useLiteLayer } from 'vue-lite-layer'

const { openLayer } = useLiteLayer()

const handleOpen = () => {
  openLayer({
    title: '你好，世界',
    textContent: '这是一个简单的弹层内容。',
    size: { width: '400px', height: '300px' },
  })
}
</script>

<template>
  <button @click="handleOpen">打开弹层</button>
</template>
```

## 使用 Vue 组件作为内容

弹层的 `content` 属性支持传入 Vue 组件，并通过 `props` 传递数据：

```vue
<!-- MyForm.vue -->
<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

const props = defineProps<{
  userId: number
}>()

const { resolveOk, close } = useLayerEvent()

const handleSubmit = () => {
  // 将数据传回给调用方
  resolveOk({ userId: props.userId, status: 'saved' })
  close()
}
</script>

<template>
  <div style="padding: 20px">
    <p>用户 ID: {{ userId }}</p>
    <button @click="handleSubmit">提交</button>
  </div>
</template>
```

在调用方打开弹层：

```vue
<script setup lang="ts">
import { useLiteLayer } from 'vue-lite-layer'
import MyForm from './MyForm.vue'

const { openLayer } = useLiteLayer()

const handleOpen = () => {
  openLayer({
    title: '编辑用户',
    content: MyForm,
    props: { userId: 123 },
    size: { width: '500px', height: '400px' },
    onOk: (message) => {
      console.log('用户提交了:', message)
    }
  })
}
</script>
```

## 控制弹层实例

`openLayer` 返回一个弹层实例对象，可以用来手动控制弹层：

```typescript
const instance = openLayer({
  title: '可控弹层',
  content: MyComponent,
})

// 手动关闭
instance?.close()

// 将弹层置顶
instance?.bringToTop()

// 最大化
instance?.maximize()

// 还原
instance?.restore()
```

## 关闭弹层

```typescript
const { openLayer, closeLayer, closeAllLayer } = useLiteLayer()

// 关闭指定弹层
const instance = openLayer({ title: '弹层' })
closeLayer(instance!)

// 关闭所有弹层
closeAllLayer()
```

## 上下文与关闭语义

在组件的 `setup()` 中调用 `useLiteLayer().openLayer()` 时，Layer 会自动继承当前组件树的应用上下文和 `provide`。这包括组件级的 `<ElConfigProvider>` 语言配置，因此通常不需要再传入 `appContext`。只有组件外直接调用服务时，才传入应用的 `appContext`。

默认 Footer 的确认和取消按钮只是向内容组件发送事件，不会替业务直接关闭窗口。内容组件应在校验或请求成功后调用 `resolveOk()` / `resolveCancel()`，并在确实允许关闭时调用 `close()`。简单确认框可设置 `closeOnOk: true`。自定义 Footer 的命令同样只会发送 `emitCommand()`，是否关闭由 Footer 或内容组件显式决定。

## 下一步

- [配置项参考](../api/config) — 了解所有可用配置
- [Composables API](../api/composables) — `useLiteLayer` 和 `useLayerEvent` 的完整 API
- [关闭、生命周期与异步内容](../advanced/lifecycle) — 处理关闭守卫、结果与异步组件
- [在线演示](../demo/) — 查看交互式示例
