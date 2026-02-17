# 如何测试 AppContext 隔离功能

## 🚀 快速开始

### 1. 启动测试服务器

```bash
cd test-projects/vue-test
pnpm install
pnpm dev
```

### 2. 打开测试页面

访问：http://localhost:5174

### 3. 切换到测试标签

点击页面顶部的 **"AppContext 隔离测试"** 标签

---

## 🧪 测试用例说明

### 测试 1：Layer 中 provide 覆盖

**目的**：验证 layer 内部可以重新 provide，且不影响宿主

**步骤**：
1. 点击 "测试 1：Layer 中 provide 覆盖" 按钮
2. 观察弹出的 layer 中显示的值
3. 关闭 layer 后，查看测试结果

**预期结果**：
- Layer 内部可以读取宿主的 provides ✅
- Layer 重新 provide 后，内部使用新值 ✅
- 关闭 layer 后，宿主的值不变 ✅

**示例输出**：
```
✅ 测试 1 结果: 宿主 count 仍为 100，user 仍为 Alice
```

---

### 测试 2：Layer 中直接修改对象

**目的**：演示原型链隔离的限制（无法防止直接修改属性）

**步骤**：
1. 点击 "测试 2：Layer 中直接修改对象" 按钮
2. 观察 layer 中的修改
3. 关闭 layer 后，查看宿主的值是否被修改

**预期结果**：
- Layer 可以直接修改注入对象的属性 ⚠️
- 修改会影响宿主应用 ⚠️
- 这说明需要使用 readonly 保护

**示例输出**：
```
⚠️ 测试 2 结果: count 从 100 变为 110，user 从 "Alice" 变为 "Modified by Layer"
```

---

### 测试 3：多个 Layer 互不影响

**目的**：验证多个 layer 实例的 provides 互相隔离

**步骤**：
1. 点击 "测试 3：多个 Layer 互不影响" 按钮
2. 观察两个 layer 同时出现
3. 每个 layer 都有自己的 `layerSpecific` provide
4. 关闭其中一个 layer

**预期结果**：
- 两个 layer 各自的 `layerSpecific` 值不同 ✅
- 互不影响 ✅
- 都能读取宿主的共享 provides ✅

**示例输出**：
```
✅ 测试 3 结果: 两个 Layer 的 layerSpecific 互不影响
```

---

### 测试 4：使用 readonly 保护

**目的**：演示如何使用 readonly 防止意外修改

**步骤**：
1. 点击 "测试 4：使用 readonly 保护" 按钮
2. 观察尝试修改 readonly 对象的结果
3. 查看开发者控制台的警告信息

**预期结果**：
- readonly 对象的修改无效 ✅
- 在开发模式下会有警告 ✅
- 宿主的值不受影响 ✅

**示例输出**：
```
✅ 测试 4 结果: readonly() 可以有效防止意外修改
```

---

## 📊 观察要点

### 宿主应用状态区域

在测试页面顶部，可以实时观察：
- **计数器值**：测试 provides 的响应式对象
- **用户名**：测试 reactive 对象的属性修改

可以使用这两个按钮手动修改宿主状态：
- "宿主增加计数"
- "宿主修改用户名"

### 测试结果区域

每次测试后，会在底部显示：
- 测试标题
- 测试结果描述
- 结果类型（info/success/warning）
- 执行时间

---

## 🔍 深度测试建议

### 1. 测试 provide 覆盖的隔离性

```typescript
// 在宿主中
provide('counter', ref(0))

// 在 Layer 1 中
provide('counter', ref(100))

// 在 Layer 2 中  
provide('counter', ref(200))

// 验证：
// - Layer 1 看到 100 ✅
// - Layer 2 看到 200 ✅
// - 宿主看到 0 ✅
```

### 2. 测试嵌套 Layer

```typescript
// 宿主
provide('level', 'host')

// Layer 1
provide('level', 'layer1')
// 在 Layer 1 中打开 Layer 2

// Layer 2
const level = inject('level')
// 应该继承 Layer 1 的 'layer1'，而不是宿主的 'host'
```

### 3. 测试全局组件共享

```typescript
// 宿主注册
app.component('GlobalButton', GlobalButton)

// 在 Layer 中
// 应该能直接使用 <GlobalButton />
```

### 4. 测试全局指令共享

```typescript
// 宿主注册
app.directive('focus', focusDirective)

// 在 Layer 中
// 应该能直接使用 v-focus
```

---

## 🐛 常见问题排查

### Q: 为什么测试 2 中宿主被修改了？

**A**: 这是原型链隔离的限制。原型链只能防止 `provide()` 覆盖，无法防止直接修改对象属性。解决方法：

```typescript
// 使用 readonly 包装
app.provide('user', readonly(reactive({ name: 'Alice' })))

// 或者只提供方法
app.provide('user', {
  getName: () => state.name,
  setName: (name) => state.name = name
})
```

### Q: 如何完全隔离状态？

**A**: 如果需要完全隔离，可以：
1. 在宿主中使用 readonly 包装所有可变状态
2. 或者提供访问器方法而非直接暴露状态
3. 或者在打开 layer 时不传递 appContext（完全隔离，但无法访问全局组件）

### Q: 性能影响如何？

**A**: 几乎无性能影响。原型链是 JavaScript 的原生机制，开销极小。实际测试中，打包体积甚至略微减小（移除了冗余代码）。

---

## 📚 相关文档

- [AppContext 分析](./APP_CONTEXT_ANALYSIS.md) - 详细的问题分析
- [解决方案](./APP_CONTEXT_SOLUTION.md) - 技术方案说明
- [实施总结](./IMPLEMENTATION_SUMMARY.md) - 实施结果总结

---

## 💡 最佳实践

### ✅ 推荐做法

```typescript
// 1. 配置和常量：直接 provide（不可变）
app.provide('config', { apiUrl: 'https://api.example.com' })

// 2. 服务和工具：提供方法（不可变）
app.provide('api', {
  get: (url) => fetch(url),
  post: (url, data) => fetch(url, { method: 'POST', body: data })
})

// 3. 状态：使用 readonly 包装
app.provide('store', readonly(reactive({ count: 0 })))

// 4. 状态 + 方法：提供访问器
const state = reactive({ count: 0 })
app.provide('counter', {
  count: computed(() => state.count), // 只读
  increment: () => state.count++       // 修改方法
})
```

### ❌ 不推荐做法

```typescript
// 直接暴露可变的 reactive 对象
const store = reactive({ count: 0 })
app.provide('store', store) // Layer 可以直接修改 store.count
```

---

**测试环境**：Vue 3.5.28  
**浏览器要求**：现代浏览器（支持 ES2015+）  
**推荐浏览器**：Chrome/Edge/Firefox 最新版
