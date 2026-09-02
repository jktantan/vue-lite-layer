# Vue Lite Layer

[中文](#中文) | [English](#english)

---

## 中文

一个轻量、灵活的 Vue 3 弹层（Modal / Layer）组件库，以服务式调用为核心，支持拖拽、最大化/还原、多弹层 z-index 管理、唯一分组等功能。

### 特性

- **服务式调用** — 通过 `useLiteLayer().openLayer()` 在任意组件中打开弹层，无需在模板中预先声明
- **Vue 组件作为内容** — 弹层内容支持 Vue 组件、HTML 元素或纯文本
- **拖拽移动** — 通过标题栏拖拽移动弹层窗口，自动限制在容器边界内
- **最大化 / 还原** — 内置最大化和还原，支持双击标题栏切换
- **多弹层管理** — 自动分配 z-index，点击窗口自动置顶
- **唯一分组** — `uniqueGroup` 防止同组弹层重复打开
- **遮罩层配置** — 支持有/无遮罩，点击遮罩关闭或不关闭
- **自定义 Footer** — 底部按钮区支持默认/隐藏/自定义组件三种模式
- **Loading 状态** — 弹层内容组件可控制加载遮罩的显示和隐藏
- **事件通信** — Footer → Container → 调用方的完整事件链路
- **国际化** — 内置中文/英文，支持自定义语言包
- **Nuxt 支持** — 提供 Nuxt 模块，自动注册插件和 composables
- **Teleport** — 支持挂载到 `body` 或任意 DOM 容器
- **TypeScript** — 完整的类型定义

### 安装

```bash
npm install vue-lite-layer
# 或
pnpm add vue-lite-layer
```

### 快速开始

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

```vue
<script setup>
import { useLiteLayer } from 'vue-lite-layer'
import { getCurrentInstance } from 'vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

openLayer({
  title: '你好，世界',
  textContent: '这是一个弹层内容。',
  size: { width: '400px', height: '300px' },
}, appContext)
</script>
```

### 使用 Vue 组件作为内容

```vue
<!-- MyForm.vue -->
<script setup>
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, resolveOk, close } = useLayerEvent()

onOk(() => {
  resolveOk({ name: '张三' })
  close()
})
</script>
```

```typescript
import MyForm from './MyForm.vue'

openLayer({
  title: '编辑用户',
  content: MyForm,
  onOk: (message) => {
    console.log('表单数据:', message)
  },
}, appContext)
```

### Nuxt 集成

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-lite-layer/nuxt'],
  vueLiteLayer: {
    // 全局配置（可选）
  }
})
```

### 文档

完整文档请查看 [在线文档站点](https://github.com/user/vue-lite-layer)。

### 第三方 UI 组件（Element Plus）

- 通过 `useLiteLayer().openLayer()` 打开时，Layer 会自动继承调用组件所在树的 `provide`；因此位于祖先 `<ElConfigProvider :locale="...">` 的调用点，Layer 内的 Element Plus 组件会默认使用同一份 locale，并跟随其响应式变化。
- 无需为 lite-layer 单独传入 Element Plus 的语言配置。
- 直接调用 `$layer.open()` 时只能继承传入 `appContext` 的应用级 `provide`；若语言配置来自组件级 `ElConfigProvider`，请在该组件树内改用 `useLiteLayer().openLayer()`。
- 如业务代码单独设置了 Day.js 的全局语言，仍应自行同步 `dayjs.locale(...)`。

```vue
<script setup lang="ts">
import { ElConfigProvider, ElDatePicker } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>

<template>
  <ElConfigProvider :locale="zhCn">
    <ElDatePicker type="date" placeholder="请选择日期" />
  </ElConfigProvider>
</template>
```

### 许可证

[MIT](./LICENSE)

---

## English

A lightweight, flexible Vue 3 modal/layer component library with service-style invocation, supporting drag, maximize/restore, multi-layer z-index management, unique grouping, and more.

### Features

- **Service-style API** — Open layers from any component via `useLiteLayer().openLayer()`, no template declaration needed
- **Vue Component as Content** — Layer content supports Vue components, HTML elements, or plain text
- **Draggable** — Drag layer windows via the title bar, automatically constrained within container boundaries
- **Maximize / Restore** — Built-in maximize and restore, supports double-click title bar toggle
- **Multi-layer Management** — Automatic z-index allocation, click to bring window to top
- **Unique Group** — `uniqueGroup` prevents duplicate layers in the same group
- **Shade Configuration** — Support for shade on/off, click-to-close or not
- **Custom Footer** — Footer supports default/hidden/custom component modes
- **Loading State** — Layer content components can control loading overlay visibility
- **Event Communication** — Complete event chain from Footer → Container → Caller
- **i18n** — Built-in Chinese/English, supports custom language packs
- **Nuxt Support** — Nuxt module for automatic plugin and composable registration
- **Teleport** — Mount to `body` or any DOM container
- **TypeScript** — Full type definitions

### Installation

```bash
npm install vue-lite-layer
# or
pnpm add vue-lite-layer
```

### Quick Start

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

```vue
<script setup>
import { useLiteLayer } from 'vue-lite-layer'
import { getCurrentInstance } from 'vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

openLayer({
  title: 'Hello World',
  textContent: 'This is a layer content.',
  size: { width: '400px', height: '300px' },
}, appContext)
</script>
```

### Using Vue Components as Content

```vue
<!-- MyForm.vue -->
<script setup>
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, resolveOk, close } = useLayerEvent()

onOk(() => {
  resolveOk({ name: 'John' })
  close()
})
</script>
```

```typescript
import MyForm from './MyForm.vue'

openLayer({
  title: 'Edit User',
  content: MyForm,
  onOk: (message) => {
    console.log('Form data:', message)
  },
}, appContext)
```

### Nuxt Integration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-lite-layer/nuxt'],
  vueLiteLayer: {
    // Global config (optional)
  }
})
```

### Documentation

See the full documentation at the [online docs site](https://github.com/user/vue-lite-layer).

### Third-party UI Components (Element Plus)

- When opened through `useLiteLayer().openLayer()`, a Layer inherits the caller component tree's `provide` values. Element Plus components therefore use, and react to changes in, an ancestor `<ElConfigProvider :locale="...">` by default.
- No separate Element Plus locale needs to be configured for lite-layer.
- Direct `$layer.open()` calls only inherit application-level provides from the supplied `appContext`. For a component-scoped `ElConfigProvider`, call `useLiteLayer().openLayer()` from within that component tree.
- If application code configures Day.js globally, synchronize `dayjs.locale(...)` separately.

```vue
<script setup lang="ts">
import { ElConfigProvider, ElDatePicker } from 'element-plus'
import en from 'element-plus/es/locale/lang/en'
</script>

<template>
  <ElConfigProvider :locale="en">
    <ElDatePicker type="date" placeholder="Pick a date" />
  </ElConfigProvider>
</template>
```

### License

[MIT](./LICENSE)
