# 版本更新草稿

## v0.1.19 (待发布)

### ✨ 改进

1. **改进 AppContext 透传与隔离**
   - 在 layer app `mount` 之前注入宿主 `appContext`，确保 `inject` 解析时即可访问宿主资源。
   - 共享宿主的全局组件、指令和配置，并通过 `Object.create(appContext.provides)` 继承 provides。
   - `useLiteLayer().openLayer()` 默认自动使用当前组件 `appContext`，减少手动传参。
   - 相关文件：`lib/index.ts`, `lib/composables/use-lite-layer.ts`

2. **统一测试工程为 TypeScript**
   - `vue-test`：入口切换为 `main.ts`，主要测试页面改为 `lang="ts"`。
   - `nuxt-test`：`app.vue` 改为 `lang="ts"`。
   - 相关文件：`test-projects/vue-test/src/*`, `test-projects/vue-test/index.html`, `test-projects/nuxt-test/app.vue`

### 🐛 Bug 修复

1. **修复点击下层窗口时位置被重置的问题**
   - 在拖拽结束后同步更新 `windowStyle`，避免重渲染覆盖拖拽结果。
   - 非最大化时容器 resize 仅更新最大尺寸，不再触发重新定位。
   - 相关文件：`lib/composables/use-layer-size.ts`, `lib/LiteLayer.vue`

2. **修复字符串内容渲染异常**
   - `LayerContainer` 区分字符串与组件渲染路径，并补充空内容保护分支。
   - 相关文件：`lib/components/LayerContainer.vue`

3. **修复 Nuxt 样式丢失**
   - Nuxt 模块自动注入 `vue-lite-layer` 样式。
   - 相关文件：`lib/nuxt/module.ts`

4. **修复测试用例误判**
   - 调整测试 3 的注入验证方式（通过子组件验证 provide/inject 继承链）。
   - 调整测试 4 文案，明确 readonly 在生产模式下“修改被忽略”属于预期行为。
   - 相关文件：`test-projects/vue-test/src/AppContextTest.vue`

### 🧪 验证

- `lib` 构建通过。
- 纯 Vue 测试项目功能通过（基础弹层、多窗口、AppContext、readonly 场景）。
- Nuxt 测试项目功能通过。
- 纯 Vue / Nuxt 均完成 Element Plus 按需导入组件验证（含 DatePicker、Pagination、Input、Select）。
- 宿主 `ElConfigProvider` 语言切换（中文/英文）在普通 Element Plus 组件可正常体现；DatePicker 这类复杂组件在 Layer 新 app 场景建议在 Layer 内容内显式包裹 `ElConfigProvider` 并同步日期库 locale。
