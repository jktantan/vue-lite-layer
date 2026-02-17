# Nuxt 支持

Vue Lite Layer 提供了官方 Nuxt 模块，开箱即用地集成到 Nuxt 3 项目中。

## 安装

确保已安装 `vue-lite-layer`：

```bash
pnpm add vue-lite-layer
```

## 配置模块

在 `nuxt.config.ts` 中添加模块：

```typescript
export default defineNuxtConfig({
  modules: ['vue-lite-layer/nuxt'],

  // 可选的全局配置
  vueLiteLayer: {
    shade: true,
    shadeClose: true,
    size: { width: '500px', height: '400px' },
    location: 'CC',
  }
})
```

## 模块功能

Nuxt 模块会自动完成以下操作：

### 1. 自动注册插件

以客户端模式注册 Vue Lite Layer 插件，弹层依赖 DOM 操作，仅在浏览器环境中运行。

### 2. 自动导入 Composables

无需手动 `import`，以下 composables 可直接在组件中使用：

- `useLiteLayer()` — 弹层操作（打开、关闭）
- `useLayerEvent()` — 弹层内事件交互

### 3. 自动转译

将 `vue-lite-layer` 加入 Nuxt 的构建转译列表，确保库代码被正确处理。

## 使用示例

```vue
<!-- pages/index.vue -->
<script setup>
// 无需手动 import，Nuxt 自动导入
const { openLayer } = useLiteLayer()
const { appContext } = getCurrentInstance()

const handleOpen = () => {
  openLayer({
    title: '来自 Nuxt 的弹层',
    content: '在 Nuxt 中使用 Vue Lite Layer，就是这么简单。',
    size: { width: '500px', height: '300px' },
  }, appContext)
}
</script>

<template>
  <button @click="handleOpen">打开弹层</button>
</template>
```

## SSR 注意事项

Vue Lite Layer 已内置 SSR 兼容处理：

- **DOM API 保护**：`document.createElement`、`window.console` 等调用均在服务端被跳过
- **ResizeObserver**：仅在 `onMounted` 钩子中初始化，避免服务端报错
- **客户端专属**：弹层的创建和渲染仅在浏览器环境中执行

::: tip
通常你不需要额外处理 SSR 兼容性问题，模块会自动以 `client` 模式注册插件。
:::

## 全局配置

通过 `nuxt.config.ts` 的 `vueLiteLayer` 字段传入的配置会应用到所有弹层的默认值：

```typescript
export default defineNuxtConfig({
  modules: ['vue-lite-layer/nuxt'],
  vueLiteLayer: {
    shade: true,
    shadeClose: false,     // 禁止点击遮罩关闭
    max: false,            // 禁用最大化按钮
    location: 'CT',        // 顶部居中
    i18n: { locale: 'en' } // 使用英文界面
  }
})
```

这些全局默认值可以被单个 `openLayer()` 调用中的配置覆盖。
