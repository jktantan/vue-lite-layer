# 🐛 调试指南

## 问题：inject 返回 undefined

如果看到 "❌ 无法 inject testCount 或 testUser"，请按以下步骤操作：

---

## 1️⃣ 强制刷新浏览器

**重要**：普通刷新可能使用缓存！

### Windows/Linux
- `Ctrl + Shift + R` 或
- `Ctrl + F5`

### Mac
- `Cmd + Shift + R`

### 或手动清除缓存
1. 打开开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

---

## 2️⃣ 按顺序测试

### A. 先测试"原型链诊断"（黄色区域）
1. 点击"运行诊断"按钮
2. 查看输出，应该显示：
   ```
   方法 1: Object.create
     hasOwnProperty: ⚠️ 不是自有属性
   
   方法 2: 浅拷贝
     hasOwnProperty: ✅ 是自有属性
   ```

### B. 再测试"简化版测试"
1. 点击"使用 appContext 打开 Layer"
2. 应该看到：
   ```
   ✅ 成功 inject: 100
   ✅ appContext 传递成功
   ```
3. 如果仍然失败，说明库没有更新

### C. 最后测试完整功能
- 测试 0：简单弹层
- 测试 1：Provide 覆盖
- 测试 2：直接修改对象
- 测试 3：多 Layer 隔离
- 测试 4：Readonly 保护

---

## 3️⃣ 检查控制台日志

打开浏览器控制台（F12 → Console），查看：

### 应该看到的日志
```javascript
AppContextTest mounted, instance: true, appContext: true
Provides setup: { testCount: ..., testUser: ..., hasAppContext: true }
SimpleTest - appContext: true
```

### 如果看到错误
- 复制完整的错误信息
- 查看堆栈跟踪

---

## 4️⃣ 验证库版本

在浏览器控制台运行：

```javascript
// 检查是否加载了新版本
const scripts = document.querySelectorAll('script[type="module"]')
scripts.forEach(s => console.log(s.src))

// 查看时间戳，应该是最新的
```

---

## 5️⃣ 如果仍然失败

### 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)

# 清理并重启
cd test-projects/vue-test
rm -rf node_modules/.vite
pnpm dev
```

### 检查库文件

```bash
# 确认打包文件存在且是最新的
ls -lh dist/vue-lite-layer.es.js

# 应该看到今天的时间戳
```

---

## 🔍 预期行为

### ✅ 正确的结果

**简化测试**：
- Layer 打开
- 显示：`成功 inject: 100`
- 显示：`✅ appContext 传递成功`

**测试 1**：
- Layer 打开
- 显示原始值和新值
- 宿主值不变

**测试 2**：
- Layer 打开
- 显示修改后的值
- 宿主值被修改（预期行为）

### ❌ 错误的结果（说明库未更新）

- `❌ 无法 inject testCount 或 testUser`
- `count: false, user: false`

---

## 📞 报告问题时请提供

1. **浏览器信息**：Chrome/Firefox/Edge + 版本号
2. **控制台完整日志**：截图或复制文本
3. **网络标签**：查看加载的 JS 文件时间戳
4. **是否强制刷新**：确认已执行 Ctrl+Shift+R

---

## 🎯 快速验证

在控制台运行这个命令：

```javascript
// 检查 provides 是否是浅拷贝
const testProvides = { test: 'value' }
const copied = { ...testProvides }
console.log('hasOwnProperty:', copied.hasOwnProperty('test'))
// 应该输出: hasOwnProperty: true
```

如果输出 `true`，说明浅拷贝正常工作。
