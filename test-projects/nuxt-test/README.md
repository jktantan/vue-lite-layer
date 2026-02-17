# Nuxt 测试项目

测试 vue-lite-layer 在 Nuxt 3 中的集成。

## 启动

```bash
pnpm install
pnpm dev
```

访问：http://localhost:5175

## 配置

在 `nuxt.config.ts` 中配置：

```ts
export default defineNuxtConfig({
  modules: ['vue-lite-layer/nuxt'],
  
  vueLiteLayer: {
    // 全局配置
    shade: true,
    shadeClose: true,
    max: true,
    close: true
  }
})
```

## 自动导入

Nuxt 模块会自动：
- ✅ 导入 CSS 样式
- ✅ 注册插件
- ✅ 导入 composables（`useLiteLayer`, `useLayerEvent`）
- ✅ 转译库代码

## 使用

```vue
<script setup>
const { openLayer } = useLiteLayer() // 自动导入，无需 import

openLayer({
  title: '标题',
  content: '内容'
})
</script>
```
