# AppContext 注入机制分析

## 当前实现

### 代码位置：`lib/index.ts` (第 68-79 行)

```typescript
// 共享宿主应用的 appContext（全局组件、指令等）
if (appContext) {
  for (const prop in appContext.components) {
    const component = appContext.components[prop]
    if (!layerApp.component(prop) && component) {
      layerApp.component(prop, component)
    }
  }
  layerApp.mount(document.createElement('div')).$.vnode.appContext = appContext
} else {
  layerApp.mount(document.createElement('div'))
}
```

### 实现目标
让 layer 中的组件能够访问宿主应用的：
- ✅ 全局组件
- ✅ 全局指令
- ✅ 全局 provides
- ✅ 插件注入的功能

---

## 🔍 潜在问题分析

### 1. ⚠️ 直接替换 appContext 的风险

**当前做法**：
```typescript
layerApp.mount(...).$.vnode.appContext = appContext
```

**问题**：
- 直接替换 appContext 导致 layer app 和 host app **完全共享**同一个对象引用
- 如果 layer 中的代码修改了 `appContext.provides` 等，会影响宿主应用
- 多个 layer 实例会共享同一个 appContext，可能导致状态污染

**示例场景**：
```typescript
// 在 layer 内部
provide('someKey', 'value from layer')

// 这会修改共享的 appContext.provides
// 影响宿主应用和其他 layer
```

---

### 2. ⚠️ 重复操作

**问题**：
1. 先手动遍历注册组件（70-74 行）
2. 再替换整个 appContext（76 行）

**分析**：
- 第一步手动注册组件是**不必要的**
- 因为第二步直接替换了 appContext，包含所有组件
- 浪费性能且代码冗余

---

### 3. ⚠️ 临时 DOM 元素泄漏

**问题**：
```typescript
layerApp.mount(document.createElement('div'))
```

**分析**：
- mount 到一个临时创建的 div
- 这个 div 没有被添加到 DOM 树
- 但 Vue 实例持有它的引用
- 可能导致轻微的内存占用（虽然不严重）

---

### 4. ⚠️ AppContext 内容不完整（当前已解决）

**AppContext 包含**：
- `app` - Vue 应用实例
- `config` - 全局配置
- `mixins` - 全局 mixins
- `components` - 全局组件 ✅
- `directives` - 全局指令 ✅（通过替换 appContext）
- `provides` - 全局 provides ✅（通过替换 appContext）
- `optionsCache` - 缓存
- `propsCache` - Props 缓存
- `emitsCache` - Emits 缓存

**当前实现**：
- ✅ 通过直接替换 appContext，所有内容都被共享

---

### 5. ⚠️ 状态隔离问题

**风险**：
| 项目 | 共享情况 | 风险 |
|------|----------|------|
| `components` | 完全共享 | ⚠️ 低（只读） |
| `directives` | 完全共享 | ⚠️ 低（只读） |
| `provides` | **共享引用** | 🔴 **高**（可变） |
| `config` | 共享引用 | ⚠️ 中（可变） |
| `mixins` | 共享引用 | ⚠️ 低（通常不变） |

**最危险的场景**：
```typescript
// 宿主应用
app.provide('store', reactive({ count: 0 }))

// Layer 1 中
const store = inject('store')
store.count++ // 修改影响宿主和所有 layer

// Layer 2 中
const store = inject('store')
console.log(store.count) // 受到 Layer 1 的影响
```

---

## ✅ 优点分析

### 1. 功能完整性
- ✅ Layer 中的组件可以使用所有全局组件
- ✅ 可以使用全局指令
- ✅ 可以通过 inject 获取宿主的 provides
- ✅ 插件功能（如 vue-router、pinia）可用

### 2. 开发体验好
- ✅ 开发者无需关心环境差异
- ✅ 组件代码可以在宿主和 layer 中无缝使用
- ✅ 符合"环境一致"的设计目标

### 3. 简单直接
- 代码简洁
- 容易理解

---

## 🚨 风险等级评估

| 风险 | 等级 | 影响范围 | 发生概率 |
|------|------|----------|----------|
| 状态污染 | 🔴 高 | 中高 | 中 |
| 内存泄漏 | 🟡 低 | 低 | 低 |
| 性能影响 | 🟢 极低 | 极低 | 无 |
| 组件冲突 | 🟢 极低 | 低 | 极低 |

---

## 💡 改进建议

### 方案 1：创建 AppContext 副本（推荐）

```typescript
if (appContext) {
  // 创建浅拷贝，隔离可变状态
  const layerContext = Object.create(appContext)
  
  // 为每个 layer 创建独立的 provides
  layerContext.provides = Object.create(appContext.provides)
  
  // 只读属性可以共享
  // layerContext.components = appContext.components
  // layerContext.directives = appContext.directives
  
  layerApp.mount(document.createElement('div')).$.vnode.appContext = layerContext
}
```

**优点**：
- ✅ 隔离可变状态（provides）
- ✅ 共享只读资源（components, directives）
- ✅ 保持功能完整性

**缺点**：
- ⚠️ 需要理解原型链
- ⚠️ provides 修改不会传递到宿主（但这通常是期望的行为）

---

### 方案 2：只共享组件和指令

```typescript
if (appContext) {
  // 只复制只读资源
  for (const name in appContext.components) {
    layerApp.component(name, appContext.components[name])
  }
  for (const name in appContext.directives) {
    layerApp.directive(name, appContext.directives[name])
  }
  
  // 选择性地共享 provides
  for (const key in appContext.provides) {
    if (shouldShareProvide(key)) {
      layerApp.provide(key, appContext.provides[key])
    }
  }
  
  layerApp.mount(document.createElement('div'))
}
```

**优点**：
- ✅ 完全隔离
- ✅ 可控共享

**缺点**：
- ❌ 需要手动决定哪些 provides 要共享
- ❌ 可能遗漏某些全局功能
- ❌ 代码复杂

---

### 方案 3：保持当前实现 + 文档说明（折中）

**适用场景**：
- 你的应用中 provides 主要用于只读数据（如配置、服务）
- Layer 中的组件不会修改 inject 的数据
- 你能控制代码规范

**做法**：
1. 保持当前实现
2. 在文档中明确说明：
   - Layer 和宿主共享 provides
   - Layer 中不应修改 inject 的数据
   - 如需修改，应该使用 readonly() 包装

```typescript
// 文档示例
app.provide('store', readonly(reactive({ count: 0 })))
```

---

## 📊 实际风险评估

### 在典型场景下的风险

**低风险场景**（大多数情况）：
- ✅ 只使用全局组件（如 UI 库组件）
- ✅ 只使用全局指令（如 v-loading）
- ✅ Provides 用于注入配置、服务类、工具函数
- ✅ 不在 layer 中修改 inject 的状态

**高风险场景**（需要注意）：
- 🔴 Provides 注入可变状态（如 reactive store）
- 🔴 Layer 中修改 inject 的数据
- 🔴 多个 layer 同时操作共享状态

---

## 🎯 推荐方案

### 短期（当前可接受）
**保持当前实现**，因为：
1. 大多数使用场景风险低
2. 开发体验好
3. 功能完整

### 中期（建议改进）
**实现方案 1**（AppContext 副本）：
- 隔离 provides，避免状态污染
- 保持其他功能共享
- 最佳的平衡

### 长期（可选增强）
提供配置选项：
```typescript
app.use(VueLiteLayer, {
  isolateProvides: true, // 是否隔离 provides
  shareAppContext: true  // 是否共享 appContext
})
```

---

## 🔍 测试建议

创建测试用例验证：

```typescript
// 测试 1：全局组件可用
it('should use global components in layer', () => {
  app.component('GlobalButton', GlobalButton)
  openLayer({ content: ComponentUsingGlobalButton })
  // 验证组件正常渲染
})

// 测试 2：Provides 隔离
it('should isolate provides between layers', () => {
  app.provide('count', ref(0))
  
  // Layer 1 修改
  openLayer({
    content: {
      setup() {
        const count = inject('count')
        count.value = 10
      }
    }
  })
  
  // Layer 2 检查
  openLayer({
    content: {
      setup() {
        const count = inject('count')
        expect(count.value).toBe(0) // 应该不受影响
      }
    }
  })
})
```

---

## 总结

### 当前实现的评价
- ✅ **功能完整**：满足"环境一致"的目标
- ⚠️ **存在风险**：provides 共享可能导致状态污染
- 🎯 **风险可控**：在典型使用场景下风险较低

### 建议
1. **短期**：保持当前实现，添加文档说明
2. **中期**：实现 provides 隔离（方案 1）
3. **长期**：提供配置选项，让用户自主选择
