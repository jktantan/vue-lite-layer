# 配置项

## LayerGlobalConfig

全局配置，通过 `app.use(VueLiteLayer, globalConfig)` 传入，作为所有弹层的默认值。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `footer` | `boolean \| string \| Component` | `true` | 底部按钮区：`true` 显示默认按钮，`false` 隐藏，传入字符串或组件可自定义 |
| `shade` | `boolean` | `true` | 是否显示遮罩层 |
| `shadeClose` | `boolean` | `true` | 点击遮罩是否关闭弹层 |
| `maxWidth` | `string` | `'none'` | 弹层最大宽度（CSS 值，如 `'800px'`、`'90%'`） |
| `maxHeight` | `string` | `'none'` | 弹层最大高度（CSS 值） |
| `size` | `WindowSize` | `{ width: '300px', height: '400px' }` | 弹层默认尺寸 |
| `location` | `PositionPreset \| Position` | `'CC'` | 弹层定位方式，见下方说明 |
| `teleport` | `string \| HTMLElement \| RendererNode` | `'body'` | Teleport 目标，CSS 选择器或 DOM 元素 |
| `max` | `boolean` | `true` | 是否允许最大化 |
| `close` | `boolean` | `true` | 是否显示关闭按钮 |
| `closeOnOk` | `boolean` | `false` | 点击默认 Footer 的确认按钮后是否自动关闭；表单异步场景建议保持 `false` |
| `closeOnEsc` | `boolean` | `true` | 按 `Esc` 是否请求关闭弹层 |
| `trapFocus` | `boolean` | `true` | 是否将 `Tab` 键焦点限制在弹层内 |
| `restoreFocus` | `boolean` | `true` | 关闭顶层弹层后是否恢复打开前的焦点 |
| `i18n` | `{ locale?: string; messages?: object }` | `{ locale: 'zh-CN' }` | 国际化配置 |
| `asyncContent` | `AsyncContentConfig` | — | 异步内容的加载、失败和重试展示配置 |
| `banner` | `boolean` | `true` | 是否在插件安装时输出版本 banner |

## LayerConfig

单个弹层配置，通过 `openLayer(config, appContext)` 传入。继承 `LayerGlobalConfig` 的所有属性，并增加以下弹层专属属性：

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 自动生成 | 弹层唯一标识，一般无需手动指定 |
| `uniqueGroup` | `string` | — | 唯一分组标识，同组内只允许打开一个弹层 |
| `title` | `string` | `''` | 弹层标题 |
| `content` | `Component \| HTMLElement \| string` | — | 弹层内容：Vue 组件、HTML 元素或 trusted HTML 字符串。字符串会按 HTML 渲染，请勿传入未净化的用户输入；HTMLElement 会被移动到弹层内，并在切换内容或卸载时尽量恢复到原 DOM 位置 |
| `textContent` | `string` | — | 安全文本内容，按纯文本渲染，优先级高于 `content` |
| `contentType` | `'html' \| 'text'` | `'html'` | 字符串 `content` 的渲染模式；默认保留历史 HTML 行为 |
| `props` | `object \| null` | `null` | 传递给内容组件的 props |
| `onOk` | `LayerCallback \| null` | `null` | 确认回调，接收内容组件传回的数据 |
| `onCancel` | `LayerCallback \| null` | `null` | 取消回调 |
| `onCommand` | `LayerCallback \| null` | `null` | 自定义命令回调 |
| `beforeClose` | `(context) => boolean \| Promise<boolean>` | `null` | 关闭前拦截器；返回 `false` 时保持打开 |
| `onOpen` | `() => void` | `null` | Layer 挂载时调用 |
| `onOpened` | `() => void` | `null` | 入场动画完成时调用 |
| `onClose` | `(context) => void` | `null` | 通过关闭校验、开始离场时调用 |
| `onClosed` | `(context) => void` | `null` | 离场完成、卸载前调用 |

::: warning HTML 内容安全
`content` 的字符串模式用于 trusted HTML，运行时不会替你净化 HTML。展示普通文本或用户输入时，请优先使用 `textContent` 或设置 `contentType: 'text'`；确实需要展示富文本用户内容时，必须先使用可信的净化器处理。
::: 

## 关闭控制与无障碍

所有关闭入口（标题栏、遮罩、`Esc`、Footer、实例 `close()`）都会经过 `beforeClose`。它支持异步确认：

```ts
openLayer({
  title: '编辑资料',
  beforeClose: async ({ reason }) => {
    if (reason === 'shade' || reason === 'escape') {
      return window.confirm('未保存的修改将丢失，仍要关闭吗？')
    }
    return true
  }
}, appContext)
```

默认情况下，弹层会自动聚焦、锁定 `Tab` 焦点，并在关闭当前顶层弹层时恢复原焦点。Teleport 到 `body` 且带遮罩的弹层会锁定页面滚动；多个弹层同时打开时，最后一个关闭才恢复页面样式。

## 异步内容

传入 `defineAsyncComponent()` 后，Layer 会显示加载态；加载失败时提供重试按钮。可通过 `asyncContent` 自定义文案和记录错误：

```ts
openLayer({
  content: AsyncEditor,
  asyncContent: {
    loadingText: '正在加载编辑器…',
    errorText: '编辑器加载失败',
    retryText: '重新加载',
    onError: (error) => reportError(error)
  }
}, appContext)
```

## footer 详解

`footer` 属性控制弹层底部按钮区域，支持三种模式：

### 默认按钮 (`footer: true`)

显示内置的「确认」和「取消」按钮。点击按钮后触发弹层内部的 `ok` / `cancel` 事件，内容组件可通过 `useLayerEvent` 的 `onOk` / `onCancel` 进行监听。

默认 Footer 只发出 `ok` / `cancel` 事件，并不直接关闭 Layer；内容组件或自定义 Footer 必须显式调用 `close()`。确认也可显式设置 `closeOnOk: true`，用于简单确认框：

```ts
openLayer({ textContent: '确定删除？', closeOnOk: true }, appContext)
```

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
type LayerCallback = (commandOrMessage?: unknown, message?: unknown) => void
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
  i18n: { locale: 'zh-CN' },
  banner: true
}
```
