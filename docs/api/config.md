# 配置项

## LayerGlobalConfig

全局配置，通过 `app.use(VueLiteLayer, globalConfig)` 传入，作为所有弹层的默认值。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `footer` | `boolean \| Component` | `true` | 底部按钮区：`true` 显示默认按钮，`false` 隐藏，传入组件可自定义 |
| `shade` | `boolean` | `true` | 是否显示遮罩层 |
| `shadeClose` | `boolean` | `true` | 点击遮罩是否关闭弹层 |
| `maxWidth` | `string` | `'none'` | 弹层最大宽度（CSS 值，如 `'800px'`、`'90%'`） |
| `maxHeight` | `string` | `'none'` | 弹层最大高度（CSS 值） |
| `size` | `WindowSize` | `{ width: '300px', height: '400px' }` | 弹层默认尺寸 |
| `location` | `PositionPreset \| Position` | `'CC'` | 弹层定位方式，见下方说明 |
| `teleport` | `string \| HTMLElement` | `'body'` | Teleport 目标，CSS 选择器或 DOM 元素 |
| `max` | `boolean` | `true` | 是否允许最大化 |
| `close` | `boolean` | `true` | 是否显示关闭按钮 |
| `i18n` | `{ locale?: string; messages?: object }` | `{ locale: 'zh-CN' }` | 国际化配置 |

## LayerConfig

单个弹层配置，通过 `openLayer(config, appContext)` 传入。继承 `LayerGlobalConfig` 的所有属性，并增加以下弹层专属属性：

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 自动生成 | 弹层唯一标识，一般无需手动指定 |
| `uniqueGroup` | `string` | — | 唯一分组标识，同组内只允许打开一个弹层 |
| `title` | `string` | `''` | 弹层标题 |
| `content` | `Component \| HTMLElement \| string` | — | 弹层内容：Vue 组件、HTML 元素或字符串 |
| `props` | `object \| null` | `null` | 传递给内容组件的 props |
| `onOk` | `LayerCallback \| null` | `null` | 确认回调，接收内容组件传回的数据 |
| `onCancel` | `LayerCallback \| null` | `null` | 取消回调 |
| `onCommand` | `LayerCallback \| null` | `null` | 自定义命令回调 |

## footer 详解

`footer` 属性控制弹层底部按钮区域，支持三种模式：

### 默认按钮 (`footer: true`)

显示内置的「确认」和「取消」按钮。点击按钮后触发弹层内部的 `ok` / `cancel` 事件，内容组件可通过 `useLayerEvent` 的 `onOk` / `onCancel` 进行监听。

```typescript
openLayer({
  title: '默认按钮',
  content: MyComponent,
  footer: true, // 默认值
}, appContext)
```

### 隐藏按钮 (`footer: false`)

不渲染底部区域。适用于内容组件自带操作按钮，或仅展示信息无需操作的场景。

```typescript
openLayer({
  title: '无底部',
  content: MyComponent,
  footer: false,
}, appContext)
```

### 自定义组件 (`footer: Component`)

传入一个 Vue 组件，完全替换默认按钮区域。自定义底部组件使用 Footer 专用 API（`emitOk` / `emitCancel` / `emitCommand`）与弹层交互：

```vue
<!-- CustomFooter.vue -->
<script setup>
import { useLayerEvent } from 'vue-lite-layer'

// Footer 专用 API
const { emitOk, emitCancel, emitCommand, close } = useLayerEvent()

const handleSave = () => {
  emitOk()              // 通知 Container：确认
  close()
}
const handleCancel = () => {
  emitCancel()           // 通知 Container：取消
  close()
}
</script>

<template>
  <div style="display: flex; justify-content: flex-end; padding: 10px; gap: 8px; border-top: 1px solid #f0f0f0;">
    <button @click="handleCancel">取消</button>
    <button @click="handleSave">保存</button>
  </div>
</template>
```

使用自定义底部组件：

```typescript
import CustomFooter from './CustomFooter.vue'

openLayer({
  title: '自定义底部',
  content: MyComponent,
  footer: CustomFooter,
}, appContext)
```

## shade / shadeClose 详解

`shade` 和 `shadeClose` 配合使用控制遮罩行为：

| shade | shadeClose | 效果 |
| --- | --- | --- |
| `true` | `true` | 显示遮罩，点击遮罩关闭弹层（默认） |
| `true` | `false` | 显示遮罩，点击遮罩不关闭（适用于重要操作） |
| `false` | — | 不显示遮罩，页面可正常交互 |

```typescript
// 有遮罩，点击遮罩可关闭（默认）
openLayer({ shade: true, shadeClose: true, ... }, appContext)

// 有遮罩，点击遮罩不可关闭
openLayer({ shade: true, shadeClose: false, ... }, appContext)

// 无遮罩
openLayer({ shade: false, ... }, appContext)
```

::: tip
当 `shade: false` 时，弹层不会阻挡页面交互，可以同时打开多个无遮罩弹层叠加使用。
:::

## WindowSize

弹层尺寸类型，支持 CSS 字符串值：

```typescript
interface WindowSize {
  width?: string   // 如 '500px'、'80%'
  height?: string  // 如 '400px'、'60%'
}
```

## PositionPreset

预设定位枚举值，格式为 `列行`：

| 值 | 说明 |
| --- | --- |
| `'LT'` | 左上角 |
| `'LC'` | 左侧居中 |
| `'LB'` | 左下角 |
| `'CT'` | 顶部居中 |
| `'CC'` | 水平垂直居中（默认） |
| `'CB'` | 底部居中 |
| `'RT'` | 右上角 |
| `'RC'` | 右侧居中 |
| `'RB'` | 右下角 |

也可以传入自定义坐标对象：

```typescript
interface Position {
  top: string   // CSS top 值，如 '100px'
  left: string  // CSS left 值，如 '200px'
}
```

## LayerCallback

弹层回调函数类型：

```typescript
type LayerCallback = (command?: any, message?: any) => void
```

## 配置优先级

配置的合并优先级从高到低为：

1. `openLayer()` 调用时传入的配置
2. `app.use(VueLiteLayer, globalConfig)` 注册时传入的全局配置
3. 内置默认值（`defaultConfig`）

```typescript
// 内置默认值
{
  teleport: 'body',
  size: { width: '300px', height: '400px' },
  footer: true,
  shade: true,
  shadeClose: true,
  maxWidth: 'none',
  maxHeight: 'none',
  location: 'CC',
  max: true,
  close: true,
  i18n: { locale: 'zh-CN' }
}
```
