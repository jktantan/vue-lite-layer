# Vue Lite Layer - 打包测试

本目录包含两个测试项目，用于验证打包后的库在不同环境中的工作情况。

## ✅ 修复内容

**问题**：字符串内容无法渲染  
**原因**：`LayerContainer.vue` 使用 `<component :is="content">` 无法正确渲染字符串  
**修复**：添加类型判断，字符串使用 `v-html` 渲染，组件使用 `<component :is>`

## 📦 测试项目

### 1. Vue 测试项目 (vue-test)

**端口**：http://localhost:5174

**测试内容**：
- ✅ 基础弹层（字符串内容）
- ✅ 带内容组件的弹层
- ✅ 打开两个弹层（测试 z-index 和位置保持）
- ✅ 可拖拽弹层（测试拖拽后位置不重置）

**启动命令**：
```bash
cd test-projects/vue-test
pnpm install
pnpm dev
```

### 2. Nuxt 测试项目 (nuxt-test)

**端口**：http://localhost:5175

**测试内容**：
- ✅ Nuxt 模块加载
- ✅ 自动导入 composables
- ✅ 基础弹层（字符串内容）
- ✅ 带内容组件的弹层
- ✅ 打开两个弹层（测试 z-index 和位置保持）
- ✅ 可拖拽弹层（测试拖拽后位置不重置）

**启动命令**：
```bash
cd test-projects/nuxt-test
pnpm install
pnpm dev
```

## 🧪 测试步骤

### 基础功能测试
1. 点击 "基础弹层" - 应该显示字符串内容 ✅
2. 点击确定关闭弹层
3. 点击 "带内容组件的弹层" - 应该显示自定义组件 ✅

### 多窗口和位置测试（重点）
4. 点击 "打开两个弹层"
   - 应该看到两个弹层分别在左上和右下
5. 拖拽第一个弹层到中间位置
6. 拖拽第二个弹层到不同位置
7. **点击下层（被遮挡）的弹层**
   - ✅ 弹层应该置顶（z-index 增加）
   - ✅ **位置应该保持不变**（不应该跳回中心）

### 拖拽功能测试
8. 点击 "可拖拽弹层"
9. 拖拽弹层到任意位置
10. 点击确定按钮
    - ✅ 弹层应该关闭
    - ✅ 测试状态应该更新为 "拖拽和位置保持功能正常"

## 📊 预期结果

所有功能应该正常工作，特别是：
- ✅ 字符串内容正常显示
- ✅ 组件内容正常渲染
- ✅ 多窗口 z-index 管理正常
- ✅ **拖拽后位置保持不变**（本次修复的核心功能）
- ✅ Nuxt 模块正常加载和工作

## 🔧 相关修改

1. **lib/components/LayerContainer.vue**
   - 添加字符串内容判断和 v-html 渲染

2. **lib/composables/use-layer-size.ts**
   - 在 `setCurrentPosition` 中同步更新 `windowStyle`
   - 修复拖拽后位置被重置的问题

3. **lib/LiteLayer.vue**
   - 移除 `handleContainerResize` 中对 `initPosition` 的不必要调用
   - 避免 ResizeObserver 触发时重置位置
