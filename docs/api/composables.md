# Composables

Vue Lite Layer 提供两个核心 Composable 函数。

## useLiteLayer

**用途：** 在任意组件中操控弹层的打开和关闭。

### 返回值

| 方法 | 类型 | 说明 |
| --- | --- | --- |
| `openLayer` | `(options?: LayerConfig, appContext?: AppContext) => LayerInstance \| null` | 打开弹层 |
| `closeLayer` | `(instance: LayerInstance) => void` | 关闭指定弹层 |
| `closeAllLayer` | `() => void` | 关闭所有弹层 |

### openLayer

打开一个弹层，返回弹层实例对象。

**参数：**
- `options` — 弹层配置项，详见 [配置项](./config)
- `appContext` — 宿主应用上下文，用于共享全局注册的组件、指令等

**返回值：** `LayerInstance | null` — 成功返回弹层实例，失败返回 `null`（SSR 环境或唯一分组冲突时）

::: warning 关于 appContext
`appContext` 参数用于让弹层内的组件能够访问宿主应用注册的全局组件和插件。如果弹层内容中需要使用全局组件（如 UI 库组件），请务必传入此参数。
:::

```vue
<script setup>
import { useLiteLayer } from 'vue-lite-layer'
import { getCurrentInstance } from 'vue'

const { appContext } = getCurrentInstance()!
const { openLayer, closeLayer, closeAllLayer } = useLiteLayer()

// 打开弹层
const instance = openLayer({
  title: '弹层标题',
  content: '内容文本',
}, appContext)

// 关闭指定弹层
closeLayer(instance!)

// 关闭所有弹层
closeAllLayer()
</script>
```

---

## useLayerEvent

**用途：** 在弹层内容组件中使用，提供与弹层交互的事件能力。

::: tip
此 composable 仅在弹层内容组件中有效，因为它依赖弹层实例提供的事件总线。
:::

### 返回值

#### Footer 专用（通知 Container 按钮点击）

| 方法 | 类型 | 说明 |
| --- | --- | --- |
| `emitOk` | `() => void` | 触发确认事件 |
| `emitCancel` | `() => void` | 触发取消事件 |
| `emitCommand` | `(command?: any) => void` | 触发自定义命令 |

#### Container 监听 Footer 事件

| 方法 | 类型 | 说明 |
| --- | --- | --- |
| `onOk` | `(callback?: LayerCallback) => void` | 监听确认按钮点击 |
| `onCancel` | `(callback?: LayerCallback) => void` | 监听取消按钮点击 |
| `onCommand` | `(callback?: LayerCallback) => void` | 监听自定义命令 |

#### Container 向调用方传递处理结果

| 方法 | 类型 | 说明 |
| --- | --- | --- |
| `resolveOk` | `(message?: any) => void` | 确认处理完成，将结果传回给 `onOk` 回调 |
| `resolveCancel` | `(message?: any) => void` | 取消处理完成，将结果传回给 `onCancel` 回调 |
| `resolveCommand` | `(command: string, message?: any) => void` | 命令处理完成，将结果传回给 `onCommand` 回调 |

#### Loading 控制

| 方法 | 类型 | 说明 |
| --- | --- | --- |
| `startLoading` | `() => void` | 显示加载遮罩 |
| `stopLoading` | `() => void` | 隐藏加载遮罩 |

#### 通用

| 方法 | 类型 | 说明 |
| --- | --- | --- |
| `close` | `() => void` | 直接关闭弹层 |

### 事件流程

弹层的事件系统遵循以下流程：

1. **用户点击确认按钮** → Footer 通过 `emitOk()` 触发 `ok` 事件
2. **内容组件通过 `onOk` 监听** → 执行业务逻辑（如表单验证）
3. **内容组件调用 `resolveOk(data)`** → 将结果传回给调用方的 `onOk` 回调
4. **内容组件调用 `close()`** → 关闭弹层

### 基础示例

```vue
<!-- FormContent.vue - 弹层内容组件 -->
<script setup lang="ts">
import { ref } from 'vue'
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, onCancel, resolveOk, close } = useLayerEvent()

const formData = ref({ name: '', email: '' })

// 监听确认按钮
onOk(() => {
  // 执行表单验证
  if (!formData.value.name) {
    alert('请输入名称')
    return
  }
  // 验证通过，传回数据并关闭
  resolveOk(formData.value)
  close()
})

// 监听取消按钮
onCancel(() => {
  close()
})
</script>

<template>
  <div style="padding: 20px">
    <div>
      <label>名称：</label>
      <input v-model="formData.name" />
    </div>
    <div>
      <label>邮箱：</label>
      <input v-model="formData.email" />
    </div>
  </div>
</template>
```

调用方：

```typescript
openLayer({
  title: '新建用户',
  content: FormContent,
  size: { width: '500px', height: '350px' },
  onOk: (message) => {
    console.log('表单数据:', message)
    // { name: 'xxx', email: 'xxx@example.com' }
  }
}, appContext)
```

### Loading 状态

```vue
<!-- AsyncContent.vue -->
<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, startLoading, stopLoading, resolveOk, close } = useLayerEvent()

onOk(async () => {
  startLoading()
  try {
    const result = await saveData()
    resolveOk(result)
    close()
  } catch (error) {
    alert('保存失败')
  } finally {
    stopLoading()
  }
})
</script>
```

### 自定义命令

自定义命令允许内容组件发出任意类型的事件：

```vue
<!-- CommandContent.vue -->
<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

const { resolveCommand } = useLayerEvent()

const handleExport = () => {
  resolveCommand('export', { format: 'pdf' })
}

const handlePrint = () => {
  resolveCommand('print', { copies: 1 })
}
</script>

<template>
  <div>
    <button @click="handleExport">导出 PDF</button>
    <button @click="handlePrint">打印</button>
  </div>
</template>
```

调用方：

```typescript
openLayer({
  title: '文档操作',
  content: CommandContent,
  onCommand: (command, message) => {
    switch (command) {
      case 'export':
        console.log('导出格式:', message.format)
        break
      case 'print':
        console.log('打印份数:', message.copies)
        break
    }
  }
}, appContext)
```
