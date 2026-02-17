# 为什么使用浅拷贝而不是原型链？

## 🔍 问题发现

在实现 AppContext 隔离时，最初使用了 `Object.create()` 创建原型链：

```typescript
const layerContext = Object.create(appContext)
layerContext.provides = Object.create(appContext.provides)
```

**结果**：❌ Layer 中 `inject` 返回 `undefined`，无法访问宿主的 provides

---

## 🧪 原因分析

### Vue inject 的实现原理

Vue 3 的 `inject` 内部使用 `hasOwnProperty` 检查 provides：

```typescript
// Vue 内部的简化逻辑
function inject(key) {
  const provides = currentInstance.appContext.provides
  
  if (provides && provides.hasOwnProperty(key)) {  // ⚠️ 关键点
    return provides[key]
  }
  
  // 如果找不到，继续向父组件查找...
}
```

### 原型链的问题

```javascript
const hostProvides = { count: ref(0) }
const layerProvides = Object.create(hostProvides)

// 访问测试
layerProvides.count              // ✅ ref(0) - 通过原型链可以访问
layerProvides.hasOwnProperty('count')  // ❌ false - 不是自有属性！

// Vue inject 的检查
if (layerProvides.hasOwnProperty('count')) {  // ❌ false
  return layerProvides.count  // 不会执行
}
// 返回 undefined
```

### 浅拷贝的解决

```javascript
const hostProvides = { count: ref(0) }
const layerProvides = { ...hostProvides }

// 访问测试
layerProvides.count              // ✅ ref(0) - 直接访问
layerProvides.hasOwnProperty('count')  // ✅ true - 是自有属性！

// Vue inject 的检查
if (layerProvides.hasOwnProperty('count')) {  // ✅ true
  return layerProvides.count  // ✅ 返回 ref(0)
}
```

---

## 📊 对比测试

### 原型链方法

```javascript
const host = { data: 'host value' }
const layer = Object.create(host)

console.log(layer.data)                    // 'host value' ✅
console.log('data' in layer)               // true ✅
console.log(layer.hasOwnProperty('data')) // false ❌
console.log(Object.keys(layer))            // [] ❌
```

### 浅拷贝方法

```javascript
const host = { data: 'host value' }
const layer = { ...host }

console.log(layer.data)                    // 'host value' ✅
console.log('data' in layer)               // true ✅
console.log(layer.hasOwnProperty('data')) // true ✅
console.log(Object.keys(layer))            // ['data'] ✅
```

---

## ✅ 最终方案

```typescript
if (appContext) {
  // 使用浅拷贝
  const layerContext = { ...appContext }
  layerContext.provides = { ...appContext.provides }
  
  layerApp.mount(document.createElement('div')).$.vnode.appContext = layerContext
}
```

---

## 🎯 效果对比

| 方面 | 原型链 | 浅拷贝 |
|------|--------|--------|
| Vue inject 能找到 | ❌ 否 | ✅ 是 |
| hasOwnProperty | ❌ false | ✅ true |
| 性能 | 略好 | 极好 |
| 内存占用 | 略小 | 略大 |
| 隔离效果 | 理论上好 | 实际上好 |

---

## 🔬 诊断方法

可以使用以下代码测试：

```typescript
// 创建测试 provides
const hostProvides = { test: ref(0) }

// 方法 1: 原型链
const proto = Object.create(hostProvides)
console.log('原型链 hasOwnProperty:', proto.hasOwnProperty('test')) // false

// 方法 2: 浅拷贝
const shallow = { ...hostProvides }
console.log('浅拷贝 hasOwnProperty:', shallow.hasOwnProperty('test')) // true
```

---

## 📝 注意事项

### 浅拷贝的限制

虽然使用浅拷贝解决了 inject 的问题，但它仍然有局限性：

```typescript
// 宿主
const store = reactive({ count: 0 })
app.provide('store', store)

// Layer 中
const injected = inject('store')
injected.count++  // ⚠️ 仍会修改宿主的 store
```

**解决方法**：宿主使用 `readonly()` 包装

```typescript
app.provide('store', readonly(reactive({ count: 0 })))
```

---

## 🎓 经验总结

1. **不要假设 API 的实现方式**
   - 最初以为 Vue inject 会遍历原型链
   - 实际使用 hasOwnProperty 检查

2. **测试验证很重要**
   - 理论上原型链更优雅
   - 实际测试发现不工作

3. **适配实际情况**
   - 虽然浅拷贝不如原型链"优雅"
   - 但它能正常工作，这才是最重要的

---

## 🔗 相关资源

- Vue 3 inject 源码：`packages/runtime-core/src/apiInject.ts`
- MDN hasOwnProperty：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
- Vue provide/inject 文档：https://vuejs.org/guide/components/provide-inject

---

**结论**：使用浅拷贝是正确的选择，它确保了 Vue inject 能够正常工作。
