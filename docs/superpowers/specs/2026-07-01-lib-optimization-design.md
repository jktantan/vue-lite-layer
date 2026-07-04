# lib 优化设计

日期：2026-07-01

## 背景

本项目是 Vue / Nuxt 生态下的 `vue-lite-layer` 弹层库。当前 `lib` 目录包含插件入口、弹层根组件、内部组件、composables、核心 manager、i18n、Nuxt module、公共类型和样式资源。

只读分析发现，当前实现的主要风险集中在以下方面：

- `content: string` 通过 `v-html` 直接渲染，安全边界不够显式。
- 非字符串 `teleport` 的 z-index 分组 key 与关闭清理 key 不一致，可能留下内部状态。
- `open()` 在 `mount()` 后才注册实例和卸载监听，存在生命周期竞态窗口。
- 事件总线未类型化，`onOk` / `onCancel` / `onCommand` 注册后缺少自动清理。
- Nuxt 子路径直接导出 `.ts` 源文件，发布兼容性较弱。
- 公共类型导出不足，内部 `any` 与强制断言较多。
- Dialog 基础可访问性、拖拽性能和滚动阴影更新还有优化空间。
- 当前没有标准自动化测试体系，主要依赖手动 fixture 和构建命令。

## 优化目标

在保持公开 API 和现有主要运行时行为兼容的前提下，完整提升 `lib` 的安全性、正确性、类型安全、Nuxt 兼容性、可访问性、性能和可维护性。

## 范围

### 本轮纳入

- `lib/index.ts`
- `lib/LiteLayer.vue`
- `lib/components/*`
- `lib/composables/*`
- `lib/core/*`
- `lib/i18n/*`
- `lib/nuxt/*`
- `lib/types/*`
- 与库验证直接相关的配置、测试 fixture、文档

### 本轮不做

- 不做 UI 视觉风格重设计。
- 不直接移除 `content: string` 的历史 HTML 渲染行为。
- 不强制修改所有历史 API。
- 不做大规模目录重组。
- 不引入重量级运行时依赖，除非后续明确确认必要。

## 兼容原则

- 公开 API 优先采用“新增能力 + 文档标注 + 开发期 warning”，避免突然破坏用户。
- 对明确 bug 可以修复，但必须用测试锁住旧行为与新行为。
- 安全风险优先显式化边界，例如把字符串 HTML 标注为 trusted HTML，并新增更安全的文本路径，而不是直接改变历史行为。
- 类型收紧优先从内部实现和类型导出开始；对可能破坏用户代码的公开类型收窄，先通过 deprecated 注释和文档引导。

## 方案选择

采用“分阶段兼容优化”路线。

相比一次性集中重构，该路线覆盖完整但回归风险更可控；相比最小修复，该路线能同时补齐正确性、安全、Nuxt、类型、a11y、性能和测试护栏。

## 模块设计

### 1. 弹层实例创建与生命周期

目标文件：

- `lib/index.ts`
- `lib/core/layer-manager.ts`
- `lib/LiteLayer.vue`

设计：

- 统一弹层实例注册、关闭、卸载和状态清理顺序。
- 修复 `open()` 当前在 `mount()` 后才注册实例的竞态窗口。
- 关闭流程增加兜底机制：即使 CSS 动画未加载、动画时长为 0、`animationend` 没触发，也能最终卸载并清理 manager 状态。
- `uniqueGroup`、`teleportTarget`、z-index 分组清理都走统一归一化逻辑。
- 新增内部工具，例如 `normalizeTeleportTarget()`，让 `index.ts`、`LiteLayer.vue`、`layer-manager.ts` 对 teleport key 的理解一致。
- 对 `HTMLElement` teleport 使用稳定内部 key，避免打开时归到 `__element__`、关闭时从 `body` 清理的错配。
- `LayerInstance.uniqueGroup` 类型改为可选，匹配真实配置语义。
- `layerManager.remove()` 对不存在的实例或分组保持幂等，避免重复关闭时报错。

兼容性：

- 不改变用户调用 `openLayer()` / `$layer.open()` 的方式。
- 继续支持 `teleport: 'body'`、CSS selector、HTMLElement。
- 保留 `LayerInstance.teleportTarget` 字段；内部可以新增 normalized key，避免直接破坏外部字段。

### 2. 事件总线与 `useLayerEvent`

目标文件：

- `lib/core/layer-emitter.ts`
- `lib/composables/use-layer-event.ts`
- `lib/components/LayerFooter.vue`
- `lib/LiteLayer.vue`

设计：

- 给 mitt 事件加内部类型映射，减少字符串事件和 payload 错配。
- 移除或弱化模块级 `currentEmitter` 隐式状态。
- `onOk` / `onCancel` / `onCommand` 支持自动清理，避免内容组件卸载后旧监听残留。
- 保持当前 footer 行为兼容，不突然让按钮默认关闭弹层；如需增强默认行为，使用新增配置控制。

建议事件映射：

```ts
type LayerEvents = {
  ok: unknown
  cancel: unknown
  command: { command: string; message?: unknown }
  afterOk: unknown
  afterCancel: unknown
  afterCommand: { command: string; message?: unknown }
  close: void
  top: void
  maximum: void
  restore: void
  startLoading: void
  stopLoading: void
  unmount: void
}
```

实现约束：

- `useLayerEvent().onXxx()` 返回 disposer。
- 在 Vue effect scope 存在时使用 `onScopeDispose()` 自动解绑。
- 内部 emitter 注入改为显式 provide 或 plugin factory，避免依赖“先 set 再 install”的模块级共享状态。
- Footer 的 OK / Cancel 维持当前“发事件，由内容组件消费”的模型。
- 如增加默认行为，采用 `autoCloseOnFooterAction` 之类的 opt-in 配置，默认保持兼容。

兼容性：

- 原有 `onOk(callback)`、`emitOk(message)` 等调用方式继续可用。
- 新增 disposer 返回值不破坏旧调用。
- 对用户已有内容组件事件模型不做强制迁移。

### 3. 内容渲染与安全边界

目标文件：

- `lib/components/LayerContainer.vue`
- `lib/types/layer.ts`
- 文档

设计：

- 明确 `content: string` 当前是 trusted HTML，而不是普通文本。
- 新增更安全的文本路径，避免用户误把外部输入传给 `v-html`。
- 处理或收窄 `HTMLElement` content 的类型承诺。

兼容优先下，不直接把 `content: string` 改为纯文本，因为这会破坏现有 HTML 内容用法。建议：

- 保留 `content: string` 的历史 HTML 渲染行为。
- 新增显式安全字段，例如 `textContent?: string`，或新增 `contentType?: 'html' | 'text'` 并默认 `'html'`。
- 在开发环境对疑似不安全 HTML 给出 warning，例如包含 `<script`、`onerror=`、`onclick=` 等危险片段时提醒用户。
- 文档中明确：`content` 字符串会作为 HTML 渲染，调用方必须保证可信；展示普通文本应使用新 API。
- `HTMLElement` content 二选一：若决定支持，则实现专门挂载和卸载逻辑；若当前不打算支持，则先标注 deprecated，并在类型和文档中说明推荐使用 Vue component。

兼容性：

- 旧的 HTML 字符串内容继续工作。
- 新用户可以走更安全的文本 API。
- 不默认引入 DOMPurify，避免增加运行时包体；可预留 `sanitizeHtml?: (html: string) => string` 钩子。

### 4. Nuxt 与发布兼容

目标文件：

- `lib/nuxt/module.ts`
- `lib/nuxt/runtime/plugin.ts`
- `package.json`
- `vite.config.lib.ts`
- `tsconfig.lib.json`

设计：

- 避免 `./nuxt` 子路径直接导出 `.ts` 源文件带来的包兼容风险。
- 收窄 Nuxt module options，使其只包含适合 `runtimeConfig.public` 的可序列化字段。
- 补齐 `vue-lite-layer/nuxt` 的类型声明路径。

实现路径：

- 为 Nuxt module 添加独立构建输出：
  - `dist/nuxt/module.mjs`
  - `dist/nuxt/runtime/plugin.mjs`
  - `dist/nuxt/module.d.ts`
- `package.json` 的 `exports["./nuxt"]` 指向构建产物和类型文件。
- 如果现有 Vite 库构建不适合直接承担 Nuxt module 构建，则新增专用构建脚本或配置，而不是继续让发布包依赖 `.ts` 源文件入口。
- `ModuleOptions` 与完整 `LayerGlobalConfig` 拆开，避免 DOM 节点、组件、函数被放入 public runtime config。
- 对 Nuxt module 不支持的不可序列化配置给出开发期 warning，并在文档中说明替代用法。

兼容性：

- 保持 `modules: ['vue-lite-layer/nuxt']` 用法不变。
- 保持 `vueLiteLayer: { ... }` 基础配置方式不变。
- 对组件、DOM、函数类配置采用文档和 warning 引导，不静默失败。

### 5. 公共类型与内部类型安全

目标文件：

- `lib/types/*`
- `lib/index.ts`
- `lib/composables/*`
- `lib/core/*`
- `lib/i18n/index.ts`
- `lib/nuxt/runtime/plugin.ts`

设计：

- 减少内部 `any` 和强制断言。
- 让公开类型更接近实际支持能力。
- 让用户可以从根入口稳定导入公共类型。

根入口增加 type-only re-export：

```ts
export type {
  LayerConfig,
  LayerGlobalConfig,
  LayerArea,
  WindowSize,
  PixelSize,
  Position,
  PositionPreset,
} from './types/layer'

export type { LayerInstance } from './types/instance'
export type { LayerCallback } from './types/callback'
```

实现约束：

- 定义内部 `LayerService`，替代 `inject<any>('layer')`。
- `LayerCallback` 参数从 `any` 逐步改为 `unknown` 或拆分更明确的回调类型。
- `footer` 类型从 `NonNullable<unknown> | string | boolean` 收敛到真实支持范围。
- `i18n` messages 使用更明确的 `LocaleMessages` 类型。
- Nuxt plugin 移除不必要的 `any`，优先让 Nuxt 类型推断。

兼容性：

- 类型收紧可能暴露调用方原有错误用法，所以优先以内部类型修复和公开类型导出为主。
- 对公开 API 的类型收窄如涉及破坏，分阶段处理：先补文档和 deprecated 注释，后续大版本再移除。

### 6. 可访问性与交互语义

目标文件：

- `lib/LiteLayer.vue`
- `lib/components/LayerHeader.vue`
- `lib/components/LayerFooter.vue`
- 样式文件

设计：

- 让弹层具备基本 dialog 语义。
- 让 header 操作按钮支持键盘和屏幕阅读器。
- 避免 footer 按钮在表单内误触发表单提交。

实现约束：

- 弹层窗口增加 `role="dialog"`、`aria-modal`、`aria-labelledby`。
- 标题元素提供稳定 id。
- Header 图标操作从 `div` 改为 `<button type="button">`，并补齐可访问名称与键盘操作支持。
- Footer 按钮增加 `type="button"`。
- Escape 关闭可作为 opt-in 配置，例如 `closeOnEsc`；若当前没有该行为，本轮不默认改变关闭语义。
- 焦点陷阱和焦点恢复属于较大行为增强，可作为后续阶段；本轮先完成基础语义与键盘可操作性。

兼容性：

- 样式需要重置 button 默认样式，避免视觉变化。
- 不强制改变关闭逻辑。
- 不默认引入焦点陷阱依赖。

### 7. 性能与可维护性

目标文件：

- `lib/composables/use-draggable.ts`
- `lib/composables/use-layer-size.ts`
- `lib/components/LayerContainer.vue`
- `lib/core/banner.ts`
- `lib/index.ts`

设计：

- 降低拖拽时 layout thrashing。
- 滚动阴影更新去重和节流。
- 尺寸写入逻辑集中，避免 reactive style 与 DOM style 双写遗漏。
- 控制 import-time console 副作用。

实现约束：

- 拖拽：`mousedown` 时缓存容器和窗口尺寸；`mousemove` 计算坐标，DOM 写入用 `requestAnimationFrame` 合并。
- Pointer Events 可以作为后续增强；本轮如风险较高，先保留 mouse 事件并优化频率。
- 滚动阴影：计算 next class 后只有变化时才写 ref，并使用 `requestAnimationFrame` 节流。
- 尺寸：提取内部 helper，例如 `applyWindowStyle(windowEl, nextStyle)`；所有 `maximize`、`restore`、`setCurrentPosition` 走同一写入路径。
- Banner：从 import-time 输出改到 `install()` 内，或新增 `banner` 配置；兼容优先可保留默认输出，但避免仅 import 包就产生 console 副作用。

兼容性：

- 拖拽边界逻辑和视觉位置不能变化。
- Banner 行为如果改变，需要文档说明；推荐新增可关闭配置，而非直接移除。

## 测试与验证设计

当前项目没有标准自动化单元测试或 Vitest 覆盖，只有手动 fixture 和构建命令。因此实现前需要先补最低限度自动化护栏。

### 建议新增自动化测试

1. `layer-manager`
   - add/remove 幂等。
   - uniqueGroup。
   - teleport key 分组。
   - z-index 分配和清理。

2. `normalizeTeleportTarget`
   - body。
   - selector。
   - HTMLElement。
   - RendererNode。

3. `useLayerEvent`
   - emit/on。
   - disposer。
   - onScopeDispose。

4. `LayerContainer`
   - HTML content 兼容。
   - 安全文本路径。
   - scroll shadow class。

5. `LiteLayer`
   - close fallback。
   - footer button type。
   - dialog aria。

### 建议新增类型测试

- 根入口能导入 `LayerConfig`、`LayerInstance` 等类型。
- 错误类型能被 TypeScript 拦住。
- Nuxt 子路径类型可解析。

### 构建验证命令

- `pnpm type-check`
- `pnpm lib:build`
- `pnpm build`
- 如新增测试脚本，则运行 `pnpm test` 或 `pnpm test:unit`

### 手动 fixture 验证

Vue fixture：

- 基础弹层。
- 组件内容。
- 多窗口 z-index。
- teleport body / HTMLElement。
- 拖拽。

Nuxt fixture：

- module 加载。
- composables 自动导入。
- runtime config 基础选项。
- build 通过。

## 实施顺序

1. 建立测试与类型验证护栏。
2. 修复 teleport key、manager 清理、关闭兜底和生命周期竞态。
3. 类型化事件总线，增强 `useLayerEvent` 清理能力。
4. 明确内容渲染安全边界，新增安全文本路径和开发期 warning。
5. 补齐公共类型导出和内部类型收敛。
6. 改善 a11y 与性能热点。
7. 处理 Nuxt 发布兼容与 module options 边界。
8. 更新文档和 fixture 验证说明。
9. 运行完整验证并进行代码审查。

## 风险与缓解

- 行为兼容风险：通过保留默认行为、使用新增配置和测试覆盖缓解。
- 安全边界误用风险：通过文档、warning、安全文本 API 缓解。
- Nuxt 构建链变更风险：先设计可回退路径，必要时分阶段提交。
- a11y 样式变化风险：button 重置样式并做视觉/交互回归。
- 测试不足风险：实现前先补关键单元测试和类型测试。

## 完成标准

- 关键行为有自动化测试覆盖。
- `pnpm type-check`、`pnpm lib:build`、`pnpm build` 通过。
- 新增测试命令通过。
- Vue 和 Nuxt fixture 关键路径可手动验证。
- 公开 API 无无意破坏。
- 文档明确内容安全边界、Nuxt 配置子集和新增类型导出。
