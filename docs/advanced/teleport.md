# Teleport 挂载

默认情况下，弹层会通过 Vue 的 `<Teleport>` 渲染到 `<body>` 元素下。你可以通过 `teleport` 配置项将弹层挂载到任意 DOM 元素中。

## 默认行为

```typescript
openLayer({
  title: '默认挂载到 body',
  content: MyComponent,
  teleport: 'body', // 默认值
}, appContext)
```

弹层使用 `position: fixed` 定位，覆盖整个视口。

## 自定义挂载点

### 使用 CSS 选择器

```typescript
openLayer({
  title: '挂载到指定容器',
  content: MyComponent,
  teleport: '#my-container',
}, appContext)
```

### 使用 DOM 元素

```typescript
const container = document.getElementById('my-container')

openLayer({
  title: '挂载到 DOM 元素',
  content: MyComponent,
  teleport: container,
}, appContext)
```

## 局部弹层

当 `teleport` 指向非 `body` 元素时，弹层的行为会有以下变化：

| 特性 | body 挂载 | 自定义挂载 |
| --- | --- | --- |
| 定位方式 | `position: fixed` | `position: absolute` |
| 覆盖范围 | 整个视口 | 父容器范围 |
| 尺寸参考 | 视口尺寸 | 父容器尺寸 |

### 父容器要求

挂载目标的父元素应具有以下样式之一：

- `position: relative` — 弹层将相对于父元素定位，尺寸使用 `100%`
- 其他定位 — 弹层将通过 `offsetTop` / `offsetLeft` 计算偏移

### 示例

```vue
<template>
  <div class="page-layout">
    <div class="sidebar">侧边栏</div>
    <div id="main-content" style="position: relative; height: 600px; overflow: hidden;">
      <!-- 弹层将在此容器内显示 -->
      主内容区
    </div>
  </div>
</template>

<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

const openLocalLayer = () => {
  openLayer({
    title: '局部弹层',
    textContent: '此弹层仅在 main-content 容器内显示。',
    teleport: '#main-content',
    size: { width: '80%', height: '60%' },
  }, appContext)
}
</script>
```

## z-index 分组

Vue Lite Layer 会按 Teleport 目标对弹层进行分组管理 z-index。同一个 Teleport 目标下的弹层共享一个 z-index 序列，点击置顶、自动 z-index 分配都在组内独立计算。

```typescript
// 这两个弹层属于同一个 z-index 分组
openLayer({ teleport: '#container-a', ... }, appContext)
openLayer({ teleport: '#container-a', ... }, appContext)

// 这个弹层属于另一个分组
openLayer({ teleport: '#container-b', ... }, appContext)
```

当 `teleport` 是 DOM 元素时，Vue Lite Layer 会为该元素生成稳定的内部分组 key。打开、置顶和关闭都使用同一个 key，因此关闭后会正确清理 z-index 记录。

挂载目标建议通过 CSS class 或 inline style 设置定位上下文：

```css
.local-layer-host {
  position: relative;
  height: 600px;
  overflow: hidden;
}
```

## 全局设置

可以在全局配置中设置默认的 Teleport 目标：

```typescript
app.use(VueLiteLayer, {
  teleport: '#app',  // 所有弹层默认挂载到 #app
})
```

单个弹层的 `teleport` 配置可以覆盖全局设置。
