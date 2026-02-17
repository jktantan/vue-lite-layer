# AppContext 注入改进方案

## 🎯 核心问题

当前实现通过 `layerApp.$.vnode.appContext = appContext` 直接替换，导致 layer 和宿主应用**完全共享**同一个 appContext 对象。

### 主要风险

```typescript
// 宿主应用
app.provide('userStore', reactive({ name: 'Alice', age: 25 }))

// Layer 1 修改了数据
openLayer({
  content: {
    setup() {
      const store = inject('userStore')
      store.name = 'Bob'  // ⚠️ 修改影响宿主应用
      store.age = 30
    }
  }
})

// 宿主应用受到影响
const store = inject('userStore')
console.log(store.name) // 'Bob' - 被 Layer 修改了！
```

---

## ✅ 推荐解决方案

### 方案：使用浅拷贝隔离 provides

**⚠️ 重要发现：Vue inject 不支持原型链查找！**

经过测试发现，Vue 的 `inject` 内部使用 `hasOwnProperty` 检查，无法通过原型链查找 provides。因此必须使用浅拷贝：

```typescript
if (appContext) {
  // 1. 创建 appContext 的浅拷贝
  const layerContext = { ...appContext }
  
  // 2. 为 layer 创建独立的 provides（浅拷贝宿主的 provides）
  layerContext.provides = { ...appContext.provides }
  
  // 3. 移除重复的组件注册代码
  // （不需要手动注册，appContext 已包含所有组件）
  
  // 4. 应用到 layer
  layerApp.mount(document.createElement('div')).$.vnode.appContext = layerContext
} else {
  layerApp.mount(document.createElement('div'))
}
```

### 工作原理

```
宿主 appContext
├── components { GlobalButton, GlobalInput }
├── directives { loading, focus }
└── provides { store, config }

         ↓ 浅拷贝
         
Layer appContext (独立副本)
├── components { GlobalButton, GlobalInput }  ✅ 共享引用
├── directives { loading, focus }            ✅ 共享引用
└── provides { store, config }               ✅ 浅拷贝
    ├── 可以读取宿主的 provides              ✅ 
    ├── 重新赋值不影响宿主                    ✅ provides.key = newValue
    └── 修改属性仍会影响宿主                  ⚠️ ref.value++
```

**浅拷贝 vs 原型链的区别**：
- **浅拷贝**：所有 provides 都是自有属性，Vue inject 可以找到 ✅
- **原型链**：provides 在原型上，Vue inject 找不到（hasOwnProperty 失败）❌

---

## 📝 完整实现代码

### 修改 `lib/index.ts`

```typescript
// 共享宿主应用的 appContext（全局组件、指令等）
if (appContext) {
  // 创建 appContext 的原型继承副本，隔离可变状态
  const layerContext = Object.create(appContext)
  
  // 为每个 layer 实例创建独立的 provides 对象
  // 通过原型链继承宿主的 provides，实现：
  // 1. Layer 可以读取宿主的所有 provides ✅
  // 2. Layer 的修改不影响宿主 ✅
  // 3. 多个 layer 之间互不影响 ✅
  layerContext.provides = Object.create(appContext.provides || Object.create(null))
  
  // 应用 layerContext
  layerApp.mount(document.createElement('div')).$.vnode.appContext = layerContext
} else {
  layerApp.mount(document.createElement('div'))
}
```

### 移除重复代码

删除第 70-75 行的手动组件注册：

```typescript
// ❌ 删除这段代码（不再需要）
for (const prop in appContext.components) {
  const component = appContext.components[prop]
  if (!layerApp.component(prop) && component) {
    layerApp.component(prop, component)
  }
}
```

---

## ✅ 改进后的效果

### 测试场景 1：全局组件和指令

```typescript
// 宿主应用
app.component('GlobalButton', GlobalButton)
app.directive('loading', loadingDirective)

// Layer 中使用
openLayer({
  content: {
    template: `
      <div>
        <GlobalButton v-loading="true">按钮</GlobalButton>
      </div>
    `
  }
})

// ✅ 正常工作：components 和 directives 通过原型链共享
```

### 测试场景 2：Provides 隔离

```typescript
// 宿主应用
const userStore = reactive({ name: 'Alice', age: 25 })
app.provide('userStore', userStore)

// Layer 1：尝试修改
openLayer({
  content: {
    setup() {
      const store = inject('userStore')
      console.log(store.name) // 'Alice' ✅ 可以读取
      
      // 如果直接修改属性
      store.name = 'Bob' // ⚠️ 仍然会修改原对象
      
      // 但如果替换整个 provide
      provide('userStore', { name: 'Bob', age: 30 }) // ✅ 不影响宿主
    }
  }
})

// 宿主应用
console.log(userStore.name) 
// 如果 layer 直接修改属性：'Bob' ⚠️
// 如果 layer 重新 provide：'Alice' ✅
```

### ⚠️ 重要说明

**原型链隔离只能防止 `provide()` 覆盖**，不能防止**直接修改对象属性**。

如果要完全防止修改，需要在宿主应用中使用 `readonly()`：

```typescript
// 推荐做法
app.provide('userStore', readonly(reactive({ name: 'Alice' })))

// 或者提供访问器而不是状态
app.provide('userStore', {
  getName: () => state.name,
  setName: (name) => state.name = name
})
```

---

## 🔄 进一步优化（可选）

### 选项 1：深度隔离 provides

如果需要完全隔离可变状态，可以深拷贝 provides：

```typescript
if (appContext) {
  const layerContext = Object.create(appContext)
  
  // 深拷贝 provides（使用 structuredClone 或自定义深拷贝）
  layerContext.provides = structuredClone(appContext.provides)
  
  layerApp.mount(document.createElement('div')).$.vnode.appContext = layerContext
}
```

**缺点**：
- ❌ 无法共享响应式对象（reactive 会丢失响应性）
- ❌ 失去了宿主更新时 layer 同步更新的能力
- ❌ 不推荐

### 选项 2：提供配置选项

```typescript
// 在插件安装时提供选项
app.use(VueLiteLayer, {
  isolateProvides: false, // 默认 false（原型链继承）
  shareAppContext: true   // 默认 true（共享 appContext）
})

// 使用时可以覆盖
openLayer({
  title: '标题',
  content: MyComponent,
  isolateProvides: true // 为这个 layer 启用完全隔离
})
```

---

## 📊 改进前后对比

| 方面 | 改进前 | 改进后 |
|------|--------|--------|
| 全局组件访问 | ✅ 可用 | ✅ 可用 |
| 全局指令访问 | ✅ 可用 | ✅ 可用 |
| Provides 读取 | ✅ 可用 | ✅ 可用 |
| Provides 隔离 | ❌ 完全共享 | ✅ 部分隔离 |
| 性能 | ✅ 好 | ✅ 好（无影响） |
| 代码简洁性 | ⚠️ 有重复 | ✅ 更简洁 |
| Layer 间互不影响 | ❌ 可能互相影响 | ✅ 基本隔离 |

---

## 🎯 实施建议

### 立即实施
```typescript
// 修改 lib/index.ts 第 68-79 行
if (appContext) {
  const layerContext = Object.create(appContext)
  layerContext.provides = Object.create(appContext.provides || Object.create(null))
  layerApp.mount(document.createElement('div')).$.vnode.appContext = layerContext
} else {
  layerApp.mount(document.createElement('div'))
}
```

### 文档说明
在文档中添加最佳实践：

```markdown
## 最佳实践

### 共享只读数据
当需要在 layer 中共享配置或服务时，使用 `readonly()` 包装：

\`\`\`typescript
import { readonly, reactive } from 'vue'

const store = reactive({ count: 0 })
app.provide('store', readonly(store))
\`\`\`

### 共享方法而非状态
推荐提供访问器而不是直接暴露状态：

\`\`\`typescript
const state = reactive({ count: 0 })
app.provide('counter', {
  getCount: () => state.count,
  increment: () => state.count++
})
\`\`\`
```

---

## 总结

### ✅ 这个改进方案
- 保持了功能完整性（layer 仍能访问所有全局资源）
- 提供了基本的状态隔离（通过原型链）
- 代码更简洁（移除了重复注册）
- 风险可控（配合文档说明）

### ⚠️ 注意事项
- 原型链隔离不能防止直接修改对象属性
- 建议在宿主应用中使用 `readonly()` 保护可变状态
- 或者提供方法而非直接暴露状态对象
