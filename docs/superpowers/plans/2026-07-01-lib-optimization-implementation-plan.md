# lib 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在兼容现有公开 API 和主要运行时行为的前提下，完整优化 `lib` 的测试护栏、生命周期正确性、事件类型安全、内容安全边界、a11y、性能、Nuxt 发布兼容与文档。

**Architecture:** 采用分阶段兼容优化：先建立 Vitest / Vue Test Utils / 类型测试护栏，再用小型内部工具统一 teleport key、事件类型、DOM 样式写入和安全渲染路径。公开 API 以新增类型、配置和文档标注为主，避免直接破坏历史行为。

**Tech Stack:** Vue 3.5、TypeScript 5.9、Vite 7、vite-plugin-dts、Vitest、@vue/test-utils、jsdom、Nuxt 4 module、mitt、vue-i18n-lite。

## Global Constraints

- 不做 UI 视觉风格重设计。
- 不直接移除 `content: string` 的历史 HTML 渲染行为。
- 不强制修改所有历史 API。
- 不做大规模目录重组。
- 不引入重量级运行时依赖，除非后续明确确认必要。
- 公开 API 优先采用“新增能力 + 文档标注 + 开发期 warning”，避免突然破坏用户。
- 对明确 bug 可以修复，但必须用测试锁住旧行为与新行为。
- 安全风险优先显式化边界，把字符串 HTML 标注为 trusted HTML，并新增更安全的文本路径。
- 类型收紧优先从内部实现和类型导出开始；对可能破坏用户代码的公开类型收窄，先通过 deprecated 注释和文档引导。
- 本会话未获得 git commit / push 授权；执行本计划时不得提交或推送，除非用户明确要求。
- 修改代码后必须使用 code-reviewer / vue-reviewer / typescript-reviewer 做审查；触及 `v-html`、Nuxt runtime config 或外部输入边界时必须使用 security-reviewer。

---

## File Structure Map

### 新增文件

- `vitest.config.ts`：Vitest 配置，使用 jsdom、Vue plugin、`@lib` alias。
- `lib/core/teleport-target.ts`：内部 teleport 目标归一化工具；统一 selector、body、HTMLElement、RendererNode 的 z-index key。
- `lib/core/layer-service.ts`：内部 `$layer` 服务接口和 InjectionKey；替代字符串注入与 `any`。
- `lib/core/layer-events.ts`：内部 mitt 事件映射、emitter 类型、command payload、disposer 类型。
- `lib/core/html-safety.ts`：trusted HTML 开发期 warning 与纯文本内容判定工具。
- `lib/nuxt/module-options.ts`：Nuxt module 可序列化配置子集、过滤函数和 warning 函数。
- `tests/setup.ts`：测试环境 polyfill 与 console spy 清理。
- `tests/core/teleport-target.test.ts`：teleport key 归一化测试。
- `tests/core/layer-manager.test.ts`：manager add/remove、uniqueGroup、z-index 清理测试。
- `tests/core/html-safety.test.ts`：HTML warning 和文本内容优先级测试。
- `tests/composables/use-layer-event.test.ts`：事件监听、disposer、scope dispose 测试。
- `tests/components/layer-container.test.ts`：HTML 兼容、HTMLElement 渲染、textContent 安全渲染、scroll shadow 测试。
- `tests/components/lite-layer.test.ts`：关闭兜底、dialog aria、footer button type 测试。
- `tests/types/public-api.test-d.ts`：根入口公共类型导入和类型约束测试。

### 修改文件

- `package.json`：新增 `test:unit`、`test:types`、`test`、`lib:build:main`、`lib:build:nuxt` 脚本和测试依赖。
- `tsconfig.test.json`：类型测试专用配置，覆盖 `tests/types/**/*.test-d.ts` 并将 `vue-lite-layer` 映射到源码入口。
- `tsconfig.app.json` / `tsconfig.lib.json`：拆分 `tsBuildInfoFile`，避免 app / lib 构建缓存冲突。
- `vite.config.lib.ts`：保留主库构建，并新增 Nuxt module 构建分支。
- `lib/index.ts`：移除 import-time banner 副作用；使用 typed LayerService / LayerEmitter；提前注册实例和 unmount 监听；导出公共类型。
- `lib/LiteLayer.vue`：使用 normalized teleport key；增加关闭 fallback；增加 dialog aria；修复非 body parent computed style 判断；使用 typed header ref 和 typed events。
- `lib/components/LayerHeader.vue`：操作图标改为语义化 button，保留视觉样式。
- `lib/components/LayerFooter.vue`：按钮添加 `type="button"`。
- `lib/components/LayerContainer.vue`：新增 `textContent` 安全文本路径；保留 string HTML 历史行为；补齐 HTMLElement content 渲染；滚动阴影 rAF 节流和去重。
- `lib/composables/use-lite-layer.ts`：使用 `LayerServiceKey` 和显式服务接口。
- `lib/composables/use-layer-event.ts`：事件类型化；监听函数返回 disposer；使用 `onScopeDispose` 自动解绑。
- `lib/composables/use-draggable.ts`：定义 size helper 接口；缓存尺寸；rAF 合并 DOM 写入。
- `lib/composables/use-layer-size.ts`：提取 `applyWindowStyle()`，集中 reactive style 与 DOM style 双写。
- `lib/core/layer-manager.ts`：manager 方法幂等；增加 `resetForTest()` 仅供测试使用。
- `lib/core/layer-emitter.ts`：使用 typed emitter 和 `createLayerEmitterPlugin(emitter)`，移除模块级 `currentEmitter`。
- `lib/i18n/index.ts`：收敛 messages 类型，移除 `any`。
- `lib/types/layer.ts` / `lib/types/callback.ts` / `lib/types/instance.ts` / `lib/types/defaults.ts`：新增 `textContent`、`contentType`、`banner`、typed callback、optional `uniqueGroup`、normalized teleport key。
- `lib/nuxt/module.ts` / `lib/nuxt/runtime/plugin.ts`：使用 `ModuleOptions` 子集，过滤 runtime config，移除 `nuxtApp: any`。
- `docs/api/config.md` / `docs/en/api/config.md`：补充 content trusted HTML、安全文本 API、callback 类型、banner 配置。
- `docs/guide/nuxt.md` / `docs/en/guide/nuxt.md`：说明 Nuxt module 支持的可序列化配置子集。
- `docs/advanced/teleport.md` / `docs/en/advanced/teleport.md`：说明 HTMLElement teleport 分组和父容器定位要求。

---

## Task 1: 建立 Vitest、组件测试和类型测试护栏

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/core/teleport-target.test.ts`
- Create: `tests/core/layer-manager.test.ts`
- Create: `tests/core/html-safety.test.ts`
- Create: `tests/composables/use-layer-event.test.ts`
- Create: `tests/components/layer-container.test.ts`
- Create: `tests/components/lite-layer.test.ts`
- Create: `tests/types/public-api.test-d.ts`
- Create: `tsconfig.test.json`
- Modify: `package.json:46-96`
- Modify: `tsconfig.lib.json:1-14`

**Interfaces:**
- Consumes: 现有 `lib/index.ts`、`lib/core/layer-manager.ts`、`lib/components/LayerContainer.vue`、`lib/LiteLayer.vue`。
- Produces: `pnpm test:unit`、`pnpm test:types`、`pnpm test` 验证入口；后续任务使用这些测试文件先写 RED，再补实现。

- [ ] **Step 1: 修改 `package.json`，加入测试脚本和依赖**

将 `scripts` 扩展为以下内容，保留既有命令：

```json
{
  "docs:dev": "vitepress dev docs",
  "docs:build": "vitepress build docs",
  "dev": "vite",
  "build": "run-p type-check \"build-only {@}\" --",
  "preview": "vite preview",
  "build-only": "vite build",
  "type-check": "vue-tsc --build --force",
  "lint": "eslint --fix",
  "format": "prettier --write \"lib/**/*.{ts,vue,scss}\" \"docs/**/*.{ts,vue,css}\" \"src/**/*.{ts,vue}\"",
  "lib:build": "vite --config vite.config.lib.ts build",
  "test:unit": "vitest run",
  "test:types": "vue-tsc --noEmit --pretty false --project tsconfig.test.json",
  "test": "run-p test:unit test:types",
  "test:lib": "bash scripts/test-lib.sh",
  "test:lib:win": "powershell -ExecutionPolicy Bypass -File scripts/test-lib.ps1"
}
```

在 `devDependencies` 中加入：

```json
{
  "@vue/test-utils": "^2.4.6",
  "jsdom": "^27.2.0",
  "vitest": "^4.0.15"
}
```

- [ ] **Step 2: 拆分 lib tsbuildinfo 文件，避免 app/lib 缓存互相覆盖**

将 `tsconfig.lib.json` 的 `tsBuildInfoFile` 改为：

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.lib.tsbuildinfo"
  }
}
```

保留 `tsconfig.app.json` 中：

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo"
  }
}
```

- [ ] **Step 3: 创建 `tsconfig.test.json`**

```json
{
  "extends": "./tsconfig.lib.json",
  "include": ["env.d.ts", "lib/**/*", "lib/**/*.vue", "tests/types/**/*.test-d.ts"],
  "compilerOptions": {
    "composite": false,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@lib/*": ["./lib/*"],
      "vue-lite-layer": ["./lib/index.ts"]
    }
  }
}
```

- [ ] **Step 4: 创建 `vitest.config.ts`**

```ts
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('./lib', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['lib/**/*.{ts,vue}'],
      exclude: ['lib/**/*.d.ts', 'lib/assets/**']
    }
  }
})
```

- [ ] **Step 5: 创建 `tests/setup.ts`**

```ts
import { afterEach, vi } from 'vitest'

class TestResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, 'ResizeObserver', {
  value: TestResizeObserver,
  writable: true
})

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: TestResizeObserver,
  writable: true
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})
```

- [ ] **Step 6: 写入初始 RED 测试文件**

创建 `tests/core/teleport-target.test.ts`：

```ts
import { describe, expect, test } from 'vitest'
import { normalizeTeleportTarget } from '@lib/core/teleport-target'

describe('normalizeTeleportTarget', () => {
  test('returns body key for empty or body teleport', () => {
    expect(normalizeTeleportTarget(undefined).key).toBe('body')
    expect(normalizeTeleportTarget('body').key).toBe('body')
  })

  test('keeps selector strings as stable keys', () => {
    expect(normalizeTeleportTarget('#panel').key).toBe('#panel')
  })

  test('generates stable keys for HTMLElement targets', () => {
    const el = document.createElement('section')
    const first = normalizeTeleportTarget(el)
    const second = normalizeTeleportTarget(el)

    expect(first.key).toBe(second.key)
    expect(first.key).toMatch(/^element:/)
    expect(first.target).toBe(el)
  })
})
```

创建 `tests/core/layer-manager.test.ts`：

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest'
import layerManager from '@lib/core/layer-manager'
import type { LayerInstance } from '@lib/types/instance'

const createInstance = (id: string, uniqueGroup?: string, teleportTarget = 'body'): LayerInstance => ({
  id,
  uniqueGroup,
  teleportTarget,
  teleportKey: teleportTarget,
  close: vi.fn(() => true),
  bringToTop: vi.fn(),
  maximize: vi.fn(),
  restore: vi.fn()
})

describe('layerManager', () => {
  beforeEach(() => {
    layerManager.resetForTest()
  })

  test('tracks unique groups while instances are registered', () => {
    layerManager.add(createInstance('a', 'profile'))

    expect(layerManager.has('profile')).toBe(true)

    layerManager.remove('a', 'profile', 'body')

    expect(layerManager.has('profile')).toBe(false)
  })

  test('removes z-index group entries with the same teleport key used for allocation', () => {
    const zIndex = layerManager.allocateZIndex('a', 'element:1')

    expect(zIndex).toBeGreaterThan(1000)
    expect(layerManager.getZIndex('a', 'element:1')).toBe(zIndex)

    layerManager.remove('a', undefined, 'element:1')

    expect(layerManager.getZIndex('a', 'element:1')).toBe(1000)
  })

  test('remove is idempotent for unknown ids and groups', () => {
    expect(() => layerManager.remove('missing', 'group', '#target')).not.toThrow()
  })
})
```

创建 `tests/core/html-safety.test.ts`：

```ts
import { describe, expect, test, vi } from 'vitest'
import { warnIfUnsafeHtml } from '@lib/core/html-safety'

describe('html safety helpers', () => {
  test('warns in browser for script-like trusted HTML', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnIfUnsafeHtml('<img src=x onerror=alert(1)>')

    expect(warn).toHaveBeenCalledWith(
      '[vue-lite-layer] content string is rendered as trusted HTML. Use textContent for untrusted text.'
    )
  })

  test('does not warn for plain trusted HTML text', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnIfUnsafeHtml('<strong>Hello</strong>')

    expect(warn).not.toHaveBeenCalled()
  })
})
```

创建 `tests/composables/use-layer-event.test.ts`：

```ts
import mitt from 'mitt'
import { describe, expect, test, vi } from 'vitest'
import { effectScope } from 'vue'
import useLayerEvent from '@lib/composables/use-layer-event'
import type { LayerEvents } from '@lib/core/layer-events'

describe('useLayerEvent', () => {
  test('onOk returns a disposer that removes the listener', () => {
    const callback = vi.fn()
    const emitter = mitt<LayerEvents>()
    const api = useLayerEvent(emitter)

    const dispose = api.onOk(callback)
    api.emitOk('first')
    dispose()
    api.emitOk('second')

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('first')
  })

  test('onCommand receives typed command payload', () => {
    const callback = vi.fn()
    const emitter = mitt<LayerEvents>()
    const api = useLayerEvent(emitter)

    api.onCommand(callback)
    api.emitCommand('save', { id: 1 })

    expect(callback).toHaveBeenCalledWith('save', { id: 1 })
  })

  test('registered listeners are disposed with the active Vue effect scope', () => {
    const callback = vi.fn()
    const emitter = mitt<LayerEvents>()
    const scope = effectScope()

    scope.run(() => {
      const api = useLayerEvent(emitter)
      api.onCancel(callback)
    })

    emitter.emit('cancel', 'first')
    scope.stop()
    emitter.emit('cancel', 'second')

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('first')
  })
})
```

创建 `tests/components/layer-container.test.ts`：

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import LayerContainer from '@lib/components/LayerContainer.vue'

describe('LayerContainer', () => {
  test('keeps legacy content string behavior as trusted HTML', () => {
    const wrapper = mount(LayerContainer, {
      props: { content: '<strong>Hello</strong>' }
    })

    expect(wrapper.html()).toContain('<strong>Hello</strong>')
  })

  test('renders textContent as plain text, not HTML', () => {
    const wrapper = mount(LayerContainer, {
      props: { textContent: '<strong>Hello</strong>' }
    })

    expect(wrapper.text()).toContain('<strong>Hello</strong>')
    expect(wrapper.find('strong').exists()).toBe(false)
  })

  test('textContent takes precedence over legacy content', () => {
    const wrapper = mount(LayerContainer, {
      props: {
        content: '<em>HTML</em>',
        textContent: 'Plain text'
      }
    })

    expect(wrapper.text()).toContain('Plain text')
    expect(wrapper.find('em').exists()).toBe(false)
  })

  test('renders HTMLElement content into the container host', async () => {
    const element = document.createElement('div')
    element.className = 'external-node'
    element.textContent = 'External DOM'

    const wrapper = mount(LayerContainer, {
      props: { content: element }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.external-node').exists()).toBe(true)
    expect(wrapper.text()).toContain('External DOM')
  })
})
```

创建 `tests/components/lite-layer.test.ts`：

```ts
import mitt from 'mitt'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import LiteLayer from '@lib/LiteLayer.vue'
import { createLayerEmitterPlugin } from '@lib/core/layer-emitter'
import type { LayerEvents } from '@lib/core/layer-events'

const mountLayer = () => {
  const emitter = mitt<LayerEvents>()
  const wrapper = mount(LiteLayer, {
    attachTo: document.body,
    props: {
      id: 'test-layer',
      title: 'Test Layer',
      teleport: 'body',
      content: 'content'
    },
    global: {
      plugins: [createLayerEmitterPlugin(emitter)]
    }
  })

  return { wrapper, emitter }
}

describe('LiteLayer', () => {
  test('renders dialog semantics and labelled title', async () => {
    const { wrapper } = mountLayer()
    await wrapper.vm.$nextTick()

    const dialog = wrapper.find('[role="dialog"]')

    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBeTruthy()
  })

  test('emits unmount even when leave animationend is missing', async () => {
    vi.useFakeTimers()
    const { emitter } = mountLayer()
    const unmount = vi.fn()

    emitter.on('unmount', unmount)
    emitter.emit('close')
    vi.advanceTimersByTime(250)

    expect(unmount).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  test('footer buttons are non-submit buttons', async () => {
    const { wrapper } = mountLayer()
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button.lite-layer__button')

    expect(buttons).toHaveLength(2)
    expect(buttons.every((button) => button.attributes('type') === 'button')).toBe(true)
  })
})
```

创建 `tests/types/public-api.test-d.ts`：

```ts
import type {
  LayerArea,
  LayerCallback,
  LayerConfig,
  LayerGlobalConfig,
  LayerInstance,
  PixelSize,
  Position,
  PositionPreset,
  WindowSize
} from 'vue-lite-layer'

const config: LayerConfig = {
  title: 'Typed layer',
  textContent: 'Plain text',
  contentType: 'text'
}

const globalConfig: LayerGlobalConfig = {
  banner: false,
  shade: true
}

const callback: LayerCallback = (_message?: unknown) => {}

const instance: LayerInstance = {
  id: 'a',
  teleportTarget: 'body',
  teleportKey: 'body',
  close: () => true,
  bringToTop: () => {},
  maximize: () => {},
  restore: () => {}
}

const _area: LayerArea = { top: '0', left: '0', width: '1px', height: '1px' }
const _size: WindowSize = { width: '1px' }
const _pixel: PixelSize = { width: 1, height: 1 }
const _position: Position = { top: '0', left: '0' }
const _preset: PositionPreset = 'CC' as PositionPreset

void config
void globalConfig
void callback
void instance
void _area
void _size
void _pixel
void _position
void _preset
```

- [ ] **Step 7: 运行 RED 测试，确认失败来自缺失实现**

Run:

```bash
pnpm install
pnpm test:unit
pnpm test:types
```

Expected:

```text
FAIL tests/core/teleport-target.test.ts
Error: Failed to resolve import "@lib/core/teleport-target"

FAIL tests/core/html-safety.test.ts
Error: Failed to resolve import "@lib/core/html-safety"

FAIL tests/composables/use-layer-event.test.ts
Error: Failed to resolve import "@lib/core/layer-events"
```

- [ ] **Step 8: Checkpoint，不提交**

Run:

```bash
git status --short
```

Expected: 显示新增测试和配置文件；不要运行 `git commit`，除非用户明确要求。

---

## Task 2: 统一 teleport key、manager 清理和实例生命周期

**Files:**
- Create: `lib/core/teleport-target.ts`
- Modify: `lib/core/layer-manager.ts:1-168`
- Modify: `lib/types/instance.ts:9-24`
- Modify: `lib/index.ts:0-145`
- Modify: `lib/LiteLayer.vue:95-155`
- Test: `tests/core/teleport-target.test.ts`
- Test: `tests/core/layer-manager.test.ts`

**Interfaces:**
- Consumes: Task 1 tests.
- Produces:
  - `normalizeTeleportTarget(target?: LayerConfig['teleport']): NormalizedTeleportTarget`
  - `LayerInstance.teleportKey: string`
  - `LayerInstance.uniqueGroup?: string`
  - `layerManager.resetForTest(): void`

- [ ] **Step 1: 创建 `lib/core/teleport-target.ts`**

```ts
import type { RendererNode } from 'vue'
import type { LayerConfig } from '@lib/types/layer'

export interface NormalizedTeleportTarget {
  target: NonNullable<LayerConfig['teleport']>
  key: string
  isBody: boolean
}

const elementKeys = new WeakMap<object, string>()
let nextElementId = 0

const isObjectTarget = (target: unknown): target is object => {
  return typeof target === 'object' && target !== null
}

const getElementKey = (target: object): string => {
  const existingKey = elementKeys.get(target)
  if (existingKey) return existingKey

  nextElementId += 1
  const key = `element:${nextElementId}`
  elementKeys.set(target, key)
  return key
}

export const normalizeTeleportTarget = (
  target?: LayerConfig['teleport']
): NormalizedTeleportTarget => {
  if (!target || target === 'body') {
    return { target: 'body', key: 'body', isBody: true }
  }

  if (typeof target === 'string') {
    return { target, key: target, isBody: false }
  }

  if (isObjectTarget(target)) {
    return {
      target: target as HTMLElement | RendererNode,
      key: getElementKey(target),
      isBody: false
    }
  }

  return { target: 'body', key: 'body', isBody: true }
}
```

- [ ] **Step 2: 修改 `lib/types/instance.ts`**

```ts
export interface LayerInstance {
  /** 弹层唯一标识 / Layer unique identifier */
  id: string
  /** 唯一分组标识，同组内只允许打开一个弹层 / Unique group identifier, only one layer allowed per group */
  uniqueGroup?: string
  /** Teleport 目标选择器，用于兼容旧版实例字段 / Teleport target selector kept for compatibility */
  teleportTarget: string
  /** 归一化 Teleport key，用于内部 z-index 分组和清理 / Normalized Teleport key for internal z-index grouping and cleanup */
  teleportKey: string
  /** 关闭弹层 / Close layer */
  close: () => boolean
  /** 将弹层置顶 / Bring layer to top */
  bringToTop: () => void
  /** 最大化弹层 / Maximize layer */
  maximize: () => void
  /** 还原弹层 / Restore layer */
  restore: () => void
}
```

- [ ] **Step 3: 修改 `lib/core/layer-manager.ts`，增加测试 reset 并保持 remove 幂等**

在 manager 对象中加入：

```ts
  resetForTest(): void {
    uniqueGroups.clear()
    instances.clear()
    zIndexGroups.clear()
    globalZIndex = BASE_Z_INDEX
  },
```

保留 `remove()` 的幂等行为，并确认它按传入 `teleportTarget` 删除 z-index 组：

```ts
  remove(id: string, unique?: string, teleportTarget?: string): void {
    instances.delete(id)
    if (unique) {
      uniqueGroups.delete(unique)
    }
    if (teleportTarget) {
      const group = zIndexGroups.get(teleportTarget)
      if (group) {
        group.delete(id)
        if (group.size === 0) {
          zIndexGroups.delete(teleportTarget)
        }
      }
    }
  },
```

- [ ] **Step 4: 修改 `lib/index.ts` 使用 normalized teleport key，并在 mount 前注册 unmount 监听和 instance**

导入：

```ts
import type { LayerEvents } from '@lib/core/layer-events'
import { normalizeTeleportTarget } from '@lib/core/teleport-target'
import { createLayerEmitterPlugin } from '@lib/core/layer-emitter'
```

在 `open()` 中替换 emitter / teleport / instance 逻辑为：

```ts
const emitter = mitt<LayerEvents>()
const normalizedTeleport = normalizeTeleportTarget(currentOptions.teleport)
const teleportTarget = typeof normalizedTeleport.target === 'string' ? normalizedTeleport.target : normalizedTeleport.key

const layerApp = createApp(LiteLayer, {
  ...currentOptions,
  teleport: normalizedTeleport.target,
  teleportKey: normalizedTeleport.key
})

const instance: LayerInstance = {
  id,
  uniqueGroup: currentOptions.uniqueGroup,
  teleportTarget,
  teleportKey: normalizedTeleport.key,
  close: () => {
    emitter.emit('close')
    return true
  },
  bringToTop: () => {
    emitter.emit('top')
  },
  maximize: () => {
    emitter.emit('maximum')
  },
  restore: () => {
    emitter.emit('restore')
  }
}

let isUnmounted = false
emitter.on('unmount', () => {
  if (isUnmounted) return
  isUnmounted = true
  layerApp.unmount()
  layerManager.remove(currentOptions.id!, currentOptions.uniqueGroup, normalizedTeleport.key)
})

layerManager.add(instance)

try {
  layerApp.mount(document.createElement('div'))
} catch (error) {
  layerManager.remove(currentOptions.id!, currentOptions.uniqueGroup, normalizedTeleport.key)
  throw error
}

return instance
```

`layerApp.use(...)` 改为：

```ts
layerApp.use(createLayerEmitterPlugin(emitter)).use(i18n().getI18n(currentOptions.i18n))
```

`layerApp.provide('layerParentTeleport', ...)` 改为：

```ts
layerApp.provide('layerParentTeleport', normalizedTeleport.target)
```

- [ ] **Step 5: 修改 `lib/LiteLayer.vue` 使用 `teleportKey` prop**

将 z-index 管理改为：

```ts
const normalizedTeleport = normalizeTeleportTarget(props.teleport)
const teleportGroup = props.teleportKey ?? normalizedTeleport.key
const currentZIndex = ref(layerManager.allocateZIndex(props.id!, teleportGroup))
```

将 template position 判断改为：

```vue
position: teleportGroup === 'body' ? 'fixed' : 'absolute',
```

- [ ] **Step 6: 运行 Task 2 测试**

Run:

```bash
pnpm test:unit -- tests/core/teleport-target.test.ts tests/core/layer-manager.test.ts
pnpm type-check
```

Expected:

```text
PASS tests/core/teleport-target.test.ts
PASS tests/core/layer-manager.test.ts
```

- [ ] **Step 7: Checkpoint，不提交**

Run:

```bash
git status --short
```

Expected: 只看到本任务相关文件变化；不要运行 `git commit`。

---

## Task 3: 类型化 LayerService 与 LayerEvents，移除 emitter 隐式全局状态

**Files:**
- Create: `lib/core/layer-service.ts`
- Create: `lib/core/layer-events.ts`
- Modify: `lib/core/layer-emitter.ts:0-59`
- Modify: `lib/composables/use-lite-layer.ts:0-93`
- Modify: `lib/composables/use-layer-event.ts:0-153`
- Modify: `lib/index.ts:31-145`
- Test: `tests/composables/use-layer-event.test.ts`

**Interfaces:**
- Consumes: `LayerInstance` from Task 2.
- Produces:
  - `LayerServiceKey: InjectionKey<LayerService>`
  - `LayerEvents` typed event map compatible with mitt.
  - `createLayerEmitterPlugin(emitter: LayerEmitter)`.
  - `useLayerEvent(emitter?: LayerEmitter)` test seam.

- [ ] **Step 1: 创建 `lib/core/layer-events.ts`**

```ts
import type { EventType } from 'mitt'

export interface LayerCommandPayload {
  command: string
  message?: unknown
}

export type LayerEvents = Record<EventType, unknown> & {
  ok: unknown
  cancel: unknown
  command: LayerCommandPayload
  afterOk: unknown
  afterCancel: unknown
  afterCommand: LayerCommandPayload
  close: void
  top: void
  maximum: void
  restore: void
  startLoading: void
  stopLoading: void
  unmount: void
}

export type LayerEventDisposer = () => void
```

- [ ] **Step 2: 创建 `lib/core/layer-service.ts`**

```ts
import type { AppContext, InjectionKey } from 'vue'
import type { LayerConfig } from '@lib/types/layer'
import type { LayerInstance } from '@lib/types/instance'

export interface LayerService {
  open: (options?: LayerConfig, appContext?: AppContext) => LayerInstance | null
  close: (instance: LayerInstance | null) => void
  closeAll: () => void
}

export const LayerServiceKey: InjectionKey<LayerService> = Symbol('vue-lite-layer-service')
```

- [ ] **Step 3: 重写 `lib/core/layer-emitter.ts` 为显式 plugin factory**

```ts
import type { Emitter } from 'mitt'
import { type App, inject, type InjectionKey } from 'vue'
import type { LayerEvents } from '@lib/core/layer-events'

export type LayerEmitter = Emitter<LayerEvents>

export const LayerEmitterKey: InjectionKey<LayerEmitter> = Symbol('vue-lite-layer-emitter')

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $layerEmitter: LayerEmitter
  }
}

export const createLayerEmitterPlugin = (emitter: LayerEmitter) => ({
  install(app: App) {
    app.provide(LayerEmitterKey, emitter)
    app.config.globalProperties.$layerEmitter = emitter
  }
})

export const useLayerEmitter = (): LayerEmitter => {
  const emitter = inject(LayerEmitterKey)
  if (!emitter) {
    throw new Error('[vue-lite-layer] layer emitter is only available inside a layer app')
  }
  return emitter
}
```

- [ ] **Step 4: 修改 `lib/composables/use-lite-layer.ts` 使用 `LayerServiceKey`**

```ts
import { type AppContext, getCurrentInstance, inject } from 'vue'
import type { LayerConfig } from '@lib/types/layer'
import type { LayerInstance } from '@lib/types/instance'
import { LayerServiceKey } from '@lib/core/layer-service'

export default () => {
  const $layer = inject(LayerServiceKey)
  const instance = getCurrentInstance()
  const parentTeleport = inject<LayerConfig['teleport'] | null>('layerParentTeleport', null)

  const openLayer = (options?: LayerConfig, appContext?: AppContext): LayerInstance | null => {
    const finalOptions: LayerConfig = { ...options }

    if (parentTeleport != null && finalOptions.teleport == null) {
      finalOptions.teleport = parentTeleport
    }

    const effectiveAppContext = appContext ?? instance?.appContext
    return $layer?.open(finalOptions, effectiveAppContext) ?? null
  }

  const closeLayer = (instance: LayerInstance): void => {
    $layer?.close(instance)
  }

  const closeAllLayer = (): void => {
    $layer?.closeAll()
  }

  return { openLayer, closeLayer, closeAllLayer }
}
```

- [ ] **Step 5: 修改 `lib/composables/use-layer-event.ts` 类型化并返回 disposer**

```ts
import { getCurrentScope, onScopeDispose } from 'vue'
import type { LayerCallback } from '@lib/types/callback'
import { type LayerEmitter, useLayerEmitter } from '@lib/core/layer-emitter'
import type { LayerCommandPayload, LayerEventDisposer } from '@lib/core/layer-events'

const registerDisposer = (dispose: LayerEventDisposer): LayerEventDisposer => {
  if (getCurrentScope()) {
    onScopeDispose(dispose)
  }
  return dispose
}

export default (providedEmitter?: LayerEmitter) => {
  const emitter = providedEmitter ?? useLayerEmitter()

  const emitOk = (message?: unknown): void => {
    emitter.emit('ok', message)
  }

  const emitCancel = (message?: unknown): void => {
    emitter.emit('cancel', message)
  }

  const emitCommand = (command: string, message?: unknown): void => {
    emitter.emit('command', { command, message })
  }

  const onOk = (callback?: LayerCallback): LayerEventDisposer => {
    const handler = (message?: unknown) => {
      callback ? callback(message) : emitter.emit('close')
    }
    emitter.on('ok', handler)
    return registerDisposer(() => emitter.off('ok', handler))
  }

  const onCancel = (callback?: LayerCallback): LayerEventDisposer => {
    const handler = (message?: unknown) => {
      callback ? callback(message) : emitter.emit('close')
    }
    emitter.on('cancel', handler)
    return registerDisposer(() => emitter.off('cancel', handler))
  }

  const onCommand = (callback?: LayerCallback): LayerEventDisposer => {
    const handler = (payload: LayerCommandPayload) => {
      callback?.(payload.command, payload.message)
    }
    emitter.on('command', handler)
    return registerDisposer(() => emitter.off('command', handler))
  }

  const resolveOk = (message?: unknown): void => {
    emitter.emit('afterOk', message)
  }

  const resolveCancel = (message?: unknown): void => {
    emitter.emit('afterCancel', message)
  }

  const resolveCommand = (command: string, message?: unknown): void => {
    emitter.emit('afterCommand', { command, message })
  }

  const startLoading = (): void => {
    emitter.emit('startLoading')
  }

  const stopLoading = (): void => {
    emitter.emit('stopLoading')
  }

  const close = (): void => {
    emitter.emit('close')
  }

  return {
    emitOk,
    emitCancel,
    emitCommand,
    onOk,
    onCancel,
    onCommand,
    resolveOk,
    resolveCancel,
    resolveCommand,
    startLoading,
    stopLoading,
    close
  }
}
```

- [ ] **Step 6: 修改 `lib/index.ts` provide typed service**

导入：

```ts
import { LayerServiceKey, type LayerService } from '@lib/core/layer-service'
```

将 `$layer` 声明改为：

```ts
const $layer: LayerService = {
  open: (options?: LayerConfig, appContext?: AppContext): LayerInstance | null => {
    // existing implementation
  },
  close(instance: LayerInstance | null): void {
    if (instance === null) {
      throw new Error('Instance can not be null')
    }
    layerManager.close(instance)
  },
  closeAll(): void {
    layerManager.closeAll()
  }
}
```

provide 改为：

```ts
layerApp.provide(LayerServiceKey, $layer)
app.provide(LayerServiceKey, $layer)
```

为了兼容旧代码，保留字符串 provide：

```ts
layerApp.provide('layer', $layer)
app.provide('layer', $layer)
```

- [ ] **Step 7: 运行事件测试与类型检查**

Run:

```bash
pnpm test:unit -- tests/composables/use-layer-event.test.ts
pnpm type-check
```

Expected:

```text
PASS tests/composables/use-layer-event.test.ts
```

- [ ] **Step 8: Checkpoint，不提交**

Run:

```bash
git status --short
```

Expected: 显示事件和 service 相关变更；不要运行 `git commit`。

---

## Task 4: 内容安全边界、文本内容 API、HTMLElement 内容支持与滚动阴影优化

**Files:**
- Create: `lib/core/html-safety.ts`
- Modify: `lib/types/layer.ts:67-116`
- Modify: `lib/types/defaults.ts:9-24`
- Modify: `lib/components/LayerContainer.vue:0-85`
- Modify: `lib/LiteLayer.vue:32-35`
- Test: `tests/core/html-safety.test.ts`
- Test: `tests/components/layer-container.test.ts`

**Interfaces:**
- Consumes: Task 1 tests.
- Produces:
  - `LayerConfig.textContent?: string`
  - `LayerConfig.contentType?: 'html' | 'text'`
  - `warnIfUnsafeHtml(html: string): void`
  - Explicit HTMLElement content rendering inside `LayerContainer`.

- [ ] **Step 1: 修改 `lib/types/layer.ts` 增加内容安全类型**

在类型区加入：

```ts
export type LayerContentType = 'html' | 'text'
```

在 `LayerConfig` 中加入：

```ts
  /** 安全文本内容；按纯文本渲染，优先级高于 content / Safe text content rendered as plain text, takes precedence over content */
  textContent?: string
  /** 字符串 content 的渲染模式；默认 html 以兼容历史行为 / Render mode for string content; defaults to html for compatibility */
  contentType?: LayerContentType
```

保留 `content?: Component | HTMLElement | string`，并把注释改为：

```ts
  /** 弹层内容：Vue 组件、HTML 元素或 trusted HTML 字符串 / Layer content: Vue component, HTMLElement, or trusted HTML string */
```

- [ ] **Step 2: 创建 `lib/core/html-safety.ts`**

```ts
const UNSAFE_HTML_PATTERN = /<script\b|\son\w+\s*=|javascript:/i

export const warnIfUnsafeHtml = (html: string): void => {
  if (typeof window === 'undefined') return
  if (!UNSAFE_HTML_PATTERN.test(html)) return

  console.warn(
    '[vue-lite-layer] content string is rendered as trusted HTML. Use textContent for untrusted text.'
  )
}
```

- [ ] **Step 3: 修改 `lib/components/LayerContainer.vue` template**

```vue
<template>
  <suspense>
    <div class="lite-layer__window-container">
      <div
        ref="wrapperRef"
        class="lite-layer__window-wrapper"
        :class="[shadowClass]"
        @scroll="handleScroll"
      >
        <div v-if="textContent != null">{{ textContent }}</div>
        <div v-else-if="isHTMLElementContent" ref="elementHostRef"></div>
        <div v-else-if="content && typeof content === 'string' && contentType === 'text'">{{ content }}</div>
        <div v-else-if="content && typeof content === 'string'" v-html="content"></div>
        <component v-else-if="content" :is="content" v-bind="props" ref="contentRef" />
      </div>
    </div>
    <template #fallback>
      <div class="lite-layer__window-container" style="display:flex;align-items:center;justify-content:center;">
        <div class="vll-loading-spinner" />
      </div>
    </template>
  </suspense>
</template>
```

- [ ] **Step 4: 修改 `lib/components/LayerContainer.vue` script**

```ts
<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ResizeObserver } from '@juggle/resize-observer'
import type { Component } from 'vue'
import type { LayerContentType } from '@lib/types/layer'
import { warnIfUnsafeHtml } from '@lib/core/html-safety'

const shadowClass = ref('')
const wrapperRef = ref<HTMLElement>()
const elementHostRef = ref<HTMLElement>()
const contentRef = ref()
let scrollFrame = 0

const props = withDefaults(
  defineProps<{
    content?: Component | HTMLElement | string
    textContent?: string
    contentType?: LayerContentType
    props?: object | null
  }>(),
  {
    contentType: 'html',
    props: null
  }
)

const isHTMLElementContent = computed(() => {
  return typeof HTMLElement !== 'undefined' && props.content instanceof HTMLElement
})

const renderHTMLElementContent = (): void => {
  const host = elementHostRef.value
  if (!host) return
  host.replaceChildren()
  if (isHTMLElementContent.value) {
    host.appendChild(props.content as HTMLElement)
  }
}

const setShadowClass = (nextClass: string): void => {
  if (shadowClass.value !== nextClass) {
    shadowClass.value = nextClass
  }
}

const updateShadow = (target: HTMLElement): void => {
  const { scrollTop, clientHeight, scrollHeight } = target

  if (scrollHeight <= clientHeight) {
    setShadowClass('')
  } else if (scrollTop + clientHeight >= scrollHeight - 10) {
    setShadowClass('lite-layer__shadow-top-inset')
  } else if (scrollTop <= 10) {
    setShadowClass('lite-layer__shadow-bottom-inset')
  } else {
    setShadowClass('lite-layer__shadow-horizontal-inset')
  }
}

const scheduleShadowUpdate = (target: HTMLElement): void => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    updateShadow(target)
  })
}

const handleScroll = (e: Event): void => {
  scheduleShadowUpdate(e.target as HTMLElement)
}

let resizeObserver: ResizeObserver | null = null

watch(
  () => props.content,
  async (content) => {
    if (typeof content === 'string' && props.contentType !== 'text') {
      warnIfUnsafeHtml(content)
    }
    await nextTick()
    renderHTMLElementContent()
  },
  { immediate: true }
)

onMounted(() => {
  renderHTMLElementContent()
  if (!wrapperRef.value) return
  resizeObserver = new ResizeObserver(() => {
    if (wrapperRef.value) {
      scheduleShadowUpdate(wrapperRef.value)
    }
  })
  resizeObserver.observe(wrapperRef.value)
})

onUnmounted(() => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
  elementHostRef.value?.replaceChildren()
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>
```

- [ ] **Step 5: 修改 `lib/LiteLayer.vue` 向 LayerContainer 传递新增 props**

将：

```vue
<layer-container :content="content" :props="props.props" />
```

改为：

```vue
<layer-container
  :content="content"
  :text-content="textContent"
  :content-type="contentType"
  :props="props.props"
/>
```

- [ ] **Step 6: 运行内容安全测试**

Run:

```bash
pnpm test:unit -- tests/core/html-safety.test.ts tests/components/layer-container.test.ts
pnpm type-check
```

Expected:

```text
PASS tests/core/html-safety.test.ts
PASS tests/components/layer-container.test.ts
```

- [ ] **Step 7: Security review gate**

调用 `security-reviewer` 代理，范围限定为：

```text
请审查 lib/core/html-safety.ts、lib/components/LayerContainer.vue、lib/types/layer.ts 中的 HTML 渲染安全边界。重点确认兼容保留 v-html 时，textContent 安全路径和 warning 是否足够清晰；不要提出破坏 content:string 兼容性的方案，除非标记为后续大版本建议。
```

- [ ] **Step 8: Checkpoint，不提交**

Run:

```bash
git status --short
```

Expected: 显示内容安全相关变更；不要运行 `git commit`。

---

## Task 5: 关闭兜底、a11y 语义和非 body teleport 定位修复

**Files:**
- Modify: `lib/LiteLayer.vue:0-259`
- Modify: `lib/components/LayerHeader.vue:0-102`
- Modify: `lib/components/LayerFooter.vue:0-17`
- Modify: `lib/assets/style/style.scss:23-38`
- Test: `tests/components/lite-layer.test.ts`

**Interfaces:**
- Consumes: `LayerEvents` and `createLayerEmitterPlugin()` from Task 3.
- Produces: `role="dialog"`、`aria-modal="true"`、stable title id、close fallback timer、semantic header buttons。

- [ ] **Step 1: 修改 `lib/LiteLayer.vue` template 增加 dialog 语义**

将窗口根节点改为：

```vue
<div
  v-if="visible"
  ref="windowRef"
  class="lite-layer__window"
  role="dialog"
  aria-modal="true"
  :aria-labelledby="titleId"
  :class="{
    'lite-layer__window--initial': initialHide,
    'lite-layer__window--enter': enterAnim,
    'lite-layer__window--leave': leaveAnim,
    'lite-layer__window--resizing': isResizing,
  }"
  :style="{
    maxWidth: maxWidth,
    maxHeight: maxHeight,
    pointerEvents: 'auto',
    ...layerSize.windowStyle
  }"
  @mousedown="handleWindowMouseDown"
  @animationend="handleAnimationEnd"
>
  <layer-header ref="headerRef" :title-id="titleId" :max="max" :close="close" :title="title" />
  <layer-container
    :content="content"
    :text-content="textContent"
    :content-type="contentType"
    :props="props.props"
  />
  <layer-footer v-if="footer && typeof footer === 'boolean'" />
  <component :is="footer" v-else-if="!!footer" />
  <layer-loading />
</div>
```

- [ ] **Step 2: 修改 `lib/LiteLayer.vue` script 增加 titleId 和关闭兜底**

在状态区加入：

```ts
const titleId = `lite-layer-title-${props.id}`
const LEAVE_ANIMATION_FALLBACK_MS = 220
let closeFallbackTimer: ReturnType<typeof setTimeout> | null = null
let hasUnmounted = false
```

新增 helper：

```ts
const finalizeClose = (): void => {
  if (hasUnmounted) return
  hasUnmounted = true
  if (closeFallbackTimer) {
    clearTimeout(closeFallbackTimer)
    closeFallbackTimer = null
  }
  visible.value = false
  emitter.emit('unmount')
}
```

修改 `handleClose`：

```ts
const handleClose = () => {
  if (leaveAnim.value || hasUnmounted) return
  leaveAnim.value = true
  enterAnim.value = false
  closeFallbackTimer = setTimeout(finalizeClose, LEAVE_ANIMATION_FALLBACK_MS)
}
```

修改 `handleAnimationEnd` 的 leave 分支：

```ts
if (leaveAnim.value) {
  finalizeClose()
} else if (enterAnim.value) {
  enterAnim.value = false
}
```

在 `onUnmounted` 中清理 timer：

```ts
if (closeFallbackTimer) {
  clearTimeout(closeFallbackTimer)
  closeFallbackTimer = null
}
```

- [ ] **Step 3: 修改非 body teleport parent position 判断**

将：

```ts
if (parent?.style.position === 'relative') {
```

改为：

```ts
const parentPosition = parent ? window.getComputedStyle(parent).position : 'static'
const isPositionedParent = ['relative', 'absolute', 'fixed', 'sticky'].includes(parentPosition)

if (parent && isPositionedParent) {
```

保持后续 `Object.assign(layerStyle, { width: '100%', height: '100%' })` 不变。

- [ ] **Step 4: 修改 `lib/components/LayerHeader.vue` template 使用 button**

```vue
<template>
  <div
    ref="el"
    class="lite-layer__window-header"
    :class="{ 'lite-layer__disabled-point-event': isMaximized }"
    @dblclick="handleDoubleClick"
  >
    <div :id="titleId" ref="layerTitle" class="lite-layer__window-header-title" :title="title">
      {{ title }}
    </div>

    <div class="lite-layer__window-header-operator" @mousedown.stop>
      <button
        v-if="max && !isMaximized"
        type="button"
        class="lite-layer__mask-button lite-layer__icon-maximum"
        :title="t('VueLiteLayer.maximum')"
        :aria-label="t('VueLiteLayer.maximum')"
        @click="handleMaximize"
      />
      <button
        v-if="isMaximized"
        type="button"
        class="lite-layer__mask-button lite-layer__icon-restore"
        :title="t('VueLiteLayer.restore')"
        :aria-label="t('VueLiteLayer.restore')"
        @click="handleRestore"
      />
      <button
        v-if="close"
        type="button"
        class="lite-layer__mask-button lite-layer__icon-close"
        :title="t('VueLiteLayer.close')"
        :aria-label="t('VueLiteLayer.close')"
        @click="handleClose"
      />
    </div>
  </div>
</template>
```

在 props 加入：

```ts
/** 标题元素 id，用于 aria-labelledby / Title element id for aria-labelledby */
titleId?: string
```

默认值：

```ts
titleId: undefined,
```

- [ ] **Step 5: 修改 `lib/components/LayerFooter.vue` button type**

```vue
<template>
  <div class="lite-layer__window-footer">
    <button type="button" class="lite-layer__button" @click="emitCancel">
      {{ t('VueLiteLayer.cancel') }}
    </button>
    <button type="button" class="lite-layer__button primary" @click="emitOk">
      {{ t('VueLiteLayer.ok') }}
    </button>
  </div>
</template>
```

- [ ] **Step 6: 修改 `lib/assets/style/style.scss` 重置 button 默认样式**

在 `.lite-layer__mask-button` 内加入：

```scss
border: 0;
padding: 0;
appearance: none;
```

保持 hover / active 颜色不变。

- [ ] **Step 7: 运行 LiteLayer 组件测试**

Run:

```bash
pnpm test:unit -- tests/components/lite-layer.test.ts
pnpm type-check
```

Expected:

```text
PASS tests/components/lite-layer.test.ts
```

- [ ] **Step 8: Accessibility review gate**

调用 `ecc:a11y-architect` 代理，范围限定为：

```text
请审查 lib/LiteLayer.vue、lib/components/LayerHeader.vue、lib/components/LayerFooter.vue 的 dialog 语义、按钮语义和键盘可达性。本轮不做焦点陷阱，只做基础 WCAG 语义和按钮可操作性。
```

- [ ] **Step 9: Checkpoint，不提交**

Run:

```bash
git status --short
```

Expected: 显示 a11y 和关闭兜底相关变更；不要运行 `git commit`。

---

## Task 6: 拖拽性能和尺寸写入集中化

**Files:**
- Modify: `lib/composables/use-draggable.ts:0-101`
- Modify: `lib/composables/use-layer-size.ts:0-287`
- Test: existing `pnpm test:unit`

**Interfaces:**
- Consumes: `WindowStyle` in `use-layer-size.ts`.
- Produces:
  - `DragSizeHelper` interface.
  - `applyWindowStyle(windowEl, nextStyle)` helper.

- [ ] **Step 1: 修改 `lib/composables/use-layer-size.ts` 增加集中写入 helper**

在 `WindowStyle` 后加入：

```ts
export type WindowStylePatch = Partial<WindowStyle>

const applyWindowStyle = (
  windowStyle: WindowStyle,
  windowEl: HTMLElement | undefined,
  nextStyle: WindowStylePatch
): void => {
  Object.assign(windowStyle, nextStyle)
  if (!windowEl) return

  if (nextStyle.top != null) windowEl.style.top = nextStyle.top
  if (nextStyle.left != null) windowEl.style.left = nextStyle.left
  if (nextStyle.width != null) windowEl.style.width = nextStyle.width
  if (nextStyle.height != null) windowEl.style.height = nextStyle.height
}
```

在 composable 内将 `Object.assign(windowStyle, ...)` 与 `windowEl.style.*` 双写替换为：

```ts
applyWindowStyle(windowStyle, windowEl, {
  top: '0px',
  left: '0px',
  width: maximumSize.width + 'px',
  height: maximumSize.height + 'px'
})
```

`restore()` 中替换为：

```ts
applyWindowStyle(windowStyle, windowEl, {
  top: clampedTop + 'px',
  left: clampedLeft + 'px',
  width: defaultSize.width + 'px',
  height: defaultSize.height + 'px'
})
```

`setCurrentPosition()` 中替换为：

```ts
applyWindowStyle(windowStyle, windowEl, {
  top: newTop,
  left: newLeft
})
```

- [ ] **Step 2: 修改 `lib/composables/use-draggable.ts` 类型与 rAF 写入**

用以下结构替换当前实现中的 `sizeHelper: any` 和 mousemove 逻辑：

```ts
interface DragSizeHelper {
  setCurrentPosition: (windowEl: HTMLElement | undefined) => void
}

interface DragBounds {
  maxX: number
  maxY: number
  offsetX: number
  offsetY: number
}

const SNAP_MARGIN = 10

export default () => {
  let activeDragHandle: HTMLElement | null = null
  let onMouseDown: ((e: MouseEvent) => void) | null = null
  let activeCleanup: (() => void) | null = null
  let animationFrame = 0
  let nextLeft = 0
  let nextTop = 0

  const clampDragPosition = (value: number, max: number): number => {
    if (value < SNAP_MARGIN) return 0
    if (value > max - SNAP_MARGIN) return max
    return Math.max(0, value)
  }

  const writePosition = (windowEl: HTMLElement): void => {
    animationFrame = 0
    windowEl.style.left = `${nextLeft}px`
    windowEl.style.top = `${nextTop}px`
  }

  const bindDrag = (
    handleEl: HTMLElement | undefined,
    windowEl: HTMLElement | undefined,
    containerEl: HTMLElement | undefined,
    sizeHelper: DragSizeHelper
  ) => {
    if (!handleEl || !windowEl || !containerEl) return

    onMouseDown = (e: MouseEvent) => {
      if (
        windowEl.offsetWidth === containerEl.offsetWidth &&
        windowEl.offsetHeight === containerEl.offsetHeight
      ) {
        return
      }

      const bounds: DragBounds = {
        maxX: containerEl.offsetWidth - windowEl.offsetWidth,
        maxY: containerEl.offsetHeight - windowEl.offsetHeight,
        offsetX: e.clientX - windowEl.offsetLeft,
        offsetY: e.clientY - windowEl.offsetTop
      }

      const onMouseMove = (e: MouseEvent) => {
        e.preventDefault()
        nextLeft = clampDragPosition(e.clientX - bounds.offsetX, bounds.maxX)
        nextTop = clampDragPosition(e.clientY - bounds.offsetY, bounds.maxY)

        if (!animationFrame) {
          animationFrame = requestAnimationFrame(() => writePosition(windowEl))
        }
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        if (animationFrame) {
          cancelAnimationFrame(animationFrame)
          writePosition(windowEl)
        }
        activeCleanup = null
        sizeHelper.setCurrentPosition(windowEl)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

      activeCleanup = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        if (animationFrame) {
          cancelAnimationFrame(animationFrame)
          animationFrame = 0
        }
      }
    }

    activeDragHandle = handleEl
    handleEl.addEventListener('mousedown', onMouseDown)
  }

  const unbindDrag = () => {
    activeCleanup?.()
    activeCleanup = null

    if (activeDragHandle && onMouseDown) {
      activeDragHandle.removeEventListener('mousedown', onMouseDown)
      activeDragHandle = null
      onMouseDown = null
    }
  }

  return { bindDrag, unbindDrag }
}
```

- [ ] **Step 3: 运行测试与类型检查**

Run:

```bash
pnpm test:unit
pnpm type-check
```

Expected:

```text
PASS all unit tests
```

- [ ] **Step 4: Performance review gate**

调用 `ecc:performance-optimizer` 代理，范围限定为：

```text
请审查 lib/composables/use-draggable.ts、lib/composables/use-layer-size.ts、lib/components/LayerContainer.vue 的 DOM 读写、requestAnimationFrame 使用和 Vue 响应式更新频率。不要建议引入新运行时依赖。
```

- [ ] **Step 5: Checkpoint，不提交**

Run:

```bash
git status --short
```

Expected: 显示性能相关变更；不要运行 `git commit`。

---

## Task 7: 公共类型导出、callback 收敛、i18n 类型和 banner 副作用控制

**Files:**
- Modify: `lib/index.ts:0-145`
- Modify: `lib/types/callback.ts:0-7`
- Modify: `lib/types/layer.ts:0-116`
- Modify: `lib/types/defaults.ts:9-24`
- Modify: `lib/i18n/index.ts:0-59`
- Test: `tests/types/public-api.test-d.ts`

**Interfaces:**
- Consumes: `LayerContentType` from Task 4 and `LayerService` from Task 3.
- Produces:
  - Root type exports from `vue-lite-layer`.
  - `LayerCallback = (commandOrMessage?: unknown, message?: unknown) => void`.
  - `LayerGlobalConfig.banner?: boolean`.
  - `LocaleMessages` type.

- [ ] **Step 1: 修改 `lib/types/callback.ts`**

```ts
export type LayerCallback = (commandOrMessage?: unknown, message?: unknown) => void
```

- [ ] **Step 2: 修改 `lib/types/layer.ts` 增加 `banner` 和 `teleportKey` 内部字段**

在 `LayerGlobalConfig` 中加入：

```ts
  /** 是否输出版本 banner；默认 true / Whether to print version banner; defaults to true */
  banner?: boolean
```

在 `LayerConfig` 中加入内部字段：

```ts
  /** 内部归一化 Teleport key；调用方通常不需要设置 / Internal normalized Teleport key; callers usually do not set it */
  teleportKey?: string
```

- [ ] **Step 3: 修改 `lib/types/defaults.ts`**

```ts
const defaultConfig: LayerGlobalConfig = {
  teleport: 'body',
  size: {
    width: '300px',
    height: '400px'
  },
  footer: true,
  shade: true,
  shadeClose: true,
  maxWidth: 'none',
  maxHeight: 'none',
  location: PositionPreset.CENTER_CENTER,
  max: true,
  close: true,
  banner: true,
  i18n: { locale: 'zh-CN' }
}
```

- [ ] **Step 4: 修改 `lib/index.ts` 控制 banner 输出并导出公共类型**

删除 import-time banner：

```ts
// 删除：
// if (typeof window !== 'undefined') {
//   printVersion(import.meta.env.PACKAGE_VERSION)
// }
```

在 `LiteLayer.install` 内 `$layer` 创建前加入：

```ts
if (typeof window !== 'undefined' && globalOptions?.banner !== false) {
  printVersion(import.meta.env.PACKAGE_VERSION)
}
```

文件底部改为：

```ts
export { useLiteLayer, useLayerEvent }
export type {
  LayerArea,
  LayerConfig,
  LayerContentType,
  LayerGlobalConfig,
  PixelSize,
  Position,
  WindowSize
} from '@lib/types/layer'
export { PositionPreset } from '@lib/types/layer'
export type { LayerCallback } from '@lib/types/callback'
export type { LayerInstance } from '@lib/types/instance'
export default { install: LiteLayer.install }
```

- [ ] **Step 5: 修改 `lib/i18n/index.ts` 移除 `any`**

```ts
import { createI18n } from 'vue-i18n-lite'

export type LocaleMessage = Record<string, unknown>
export type LocaleMessages = Record<string, LocaleMessage>

interface LocaleModule {
  default?: LocaleMessage
}

let builtInMessagesCache: LocaleMessages | null = null

const modules = import.meta.glob<LocaleModule>('./lang/*', { eager: true })

function getBuiltInMessages(): LocaleMessages {
  if (builtInMessagesCache) return builtInMessagesCache

  const messages: LocaleMessages = {}
  for (const path in modules) {
    const mod = modules[path]
    if (mod.default) {
      const name = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'))
      messages[name] = { ...messages[name], ...mod.default }
    }
  }
  builtInMessagesCache = messages
  return messages
}

export default () => {
  const getI18n = (localeI18n?: { locale?: string; messages?: LocaleMessages }) => {
    const builtIn = getBuiltInMessages()
    const combinedMessages: LocaleMessages = {}
    for (const locale in builtIn) {
      combinedMessages[locale] = { ...builtIn[locale] }
    }

    if (localeI18n?.messages) {
      for (const locale in localeI18n.messages) {
        combinedMessages[locale] = {
          ...combinedMessages[locale],
          ...localeI18n.messages[locale]
        }
      }
    }

    return createI18n({
      locale: localeI18n?.locale ?? 'zh-CN',
      fallbackLocale: 'en',
      messages: combinedMessages
    })
  }

  return { getI18n }
}
```

- [ ] **Step 6: 运行类型测试与构建**

Run:

```bash
pnpm test:types
pnpm type-check
pnpm lib:build
```

Expected:

```text
vue-tsc exits 0
vite build exits 0
```

- [ ] **Step 7: TypeScript review gate**

调用 `ecc:typescript-reviewer` 代理，范围限定为：

```text
请审查 lib/index.ts、lib/types/*、lib/i18n/index.ts、lib/composables/* 的类型安全。重点检查 any 是否减少、公开类型导出是否稳定、类型收窄是否有潜在破坏性。
```

- [ ] **Step 8: Checkpoint，不提交**

Run:

```bash
git status --short
```

Expected: 显示类型和 banner 相关变更；不要运行 `git commit`。

---

## Task 8: Nuxt module 可序列化配置与构建产物导出

**Files:**
- Create: `lib/nuxt/module-options.ts`
- Modify: `lib/nuxt/module.ts:0-62`
- Modify: `lib/nuxt/runtime/plugin.ts:0-8`
- Modify: `package.json:12-26,46-58`
- Modify: `vite.config.lib.ts:0-47`
- Test: `pnpm lib:build`
- Test: `pnpm type-check`

**Interfaces:**
- Consumes: `LayerGlobalConfig` and `LocaleMessages` from Task 7.
- Produces:
  - `ModuleOptions` serializable subset.
  - package export `./nuxt` points to `dist/nuxt/module.mjs` and `dist/nuxt/module.d.ts`.
  - Nuxt build also emits `dist/nuxt/runtime/plugin.mjs` because the module registers `./runtime/plugin`.

- [ ] **Step 1: 创建 `lib/nuxt/module-options.ts`**

```ts
import type { LayerGlobalConfig, Position, PositionPreset, WindowSize } from '../types/layer'
import type { LocaleMessages } from '../i18n'

export interface ModuleOptions {
  footer?: boolean | string
  shade?: boolean
  shadeClose?: boolean
  maxWidth?: string
  maxHeight?: string
  size?: WindowSize
  location?: Position | PositionPreset
  teleport?: string
  max?: boolean
  close?: boolean
  banner?: boolean
  i18n?: { locale?: string; messages?: LocaleMessages }
}

const SERIALIZABLE_OPTION_KEYS: Array<keyof ModuleOptions> = [
  'footer',
  'shade',
  'shadeClose',
  'maxWidth',
  'maxHeight',
  'size',
  'location',
  'teleport',
  'max',
  'close',
  'banner',
  'i18n'
]

export const pickSerializableModuleOptions = (options: LayerGlobalConfig): ModuleOptions => {
  return SERIALIZABLE_OPTION_KEYS.reduce<ModuleOptions>((result, key) => {
    const value = options[key]
    if (value !== undefined) {
      return { ...result, [key]: value }
    }
    return result
  }, {})
}

export const warnUnsupportedModuleOptions = (options: LayerGlobalConfig): void => {
  if (typeof options.teleport !== 'string' && options.teleport != null) {
    console.warn('[vue-lite-layer/nuxt] vueLiteLayer.teleport must be a string in nuxt.config.')
  }

  if (typeof options.footer === 'object' && options.footer != null) {
    console.warn('[vue-lite-layer/nuxt] vueLiteLayer.footer must be boolean or string in nuxt.config.')
  }
}
```

- [ ] **Step 2: 修改 `lib/nuxt/module.ts` 使用 ModuleOptions**

```ts
import { defineNuxtModule, addPlugin, addImports, createResolver } from '@nuxt/kit'
import { defu } from 'defu'
import type { LayerGlobalConfig } from '../types/layer'
import {
  pickSerializableModuleOptions,
  warnUnsupportedModuleOptions,
  type ModuleOptions
} from './module-options'

export type { ModuleOptions }

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'vue-lite-layer',
    configKey: 'vueLiteLayer',
    compatibility: {
      nuxt: '>=3.0.0'
    }
  },
  defaults: {},
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    warnUnsupportedModuleOptions(options as LayerGlobalConfig)
    const serializableOptions = pickSerializableModuleOptions(options as LayerGlobalConfig)

    nuxt.options.runtimeConfig.public.vueLiteLayer = defu(
      (nuxt.options.runtimeConfig.public.vueLiteLayer as Record<string, unknown>) || {},
      serializableOptions
    )

    addPlugin({
      src: resolver.resolve('./runtime/plugin'),
      mode: 'client'
    })

    nuxt.options.css = nuxt.options.css || []
    nuxt.options.css.push('vue-lite-layer/dist/vue-lite-layer.css')

    addImports([
      { name: 'useLiteLayer', from: 'vue-lite-layer' },
      { name: 'useLayerEvent', from: 'vue-lite-layer' }
    ])

    nuxt.options.build.transpile.push('vue-lite-layer')
  }
})
```

- [ ] **Step 3: 修改 `lib/nuxt/runtime/plugin.ts` 移除 `any`**

```ts
// @ts-expect-error - #imports is resolved by Nuxt at build time for runtime plugins
import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import VueLiteLayer from 'vue-lite-layer'
import type { ModuleOptions } from '../module-options'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const options = (config.public.vueLiteLayer || {}) as ModuleOptions
  nuxtApp.vueApp.use(VueLiteLayer, options)
})
```

- [ ] **Step 4: 修改 `package.json` exports 和 scripts**

将 `exports["./nuxt"]` 改为：

```json
"./nuxt": {
  "types": "./dist/nuxt/module.d.ts",
  "import": "./dist/nuxt/module.mjs"
}
```

将 `nuxt.module` 改为：

```json
"nuxt": {
  "module": "./dist/nuxt/module.mjs"
}
```

将 `lib:build` 改为同时构建主库和 Nuxt module：

```json
"lib:build": "run-s lib:build:main lib:build:nuxt",
"lib:build:main": "vite --config vite.config.lib.ts build",
"lib:build:nuxt": "vite --config vite.config.lib.ts build --mode nuxt"
```

- [ ] **Step 5: 修改 `vite.config.lib.ts` 支持 Nuxt mode**

```ts
import { fileURLToPath, URL } from 'node:url'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import loadVersion from 'vite-plugin-package-version'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const isNuxtBuild = mode === 'nuxt'

  return {
    plugins: [
      vue(),
      vueJsx(),
      loadVersion(),
      dts({
        insertTypesEntry: !isNuxtBuild,
        tsconfigPath: 'tsconfig.lib.json',
        outDir: isNuxtBuild ? 'dist/nuxt' : 'dist',
        entryRoot: isNuxtBuild ? 'lib/nuxt' : 'lib'
      })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    },
    resolve: {
      alias: {
        '@lib': fileURLToPath(new URL('./lib', import.meta.url))
      }
    },
    esbuild: {
      drop: []
    },
    build: isNuxtBuild
      ? {
          lib: {
            entry: {
              module: resolve(__dirname, 'lib/nuxt/module.ts'),
              'runtime/plugin': resolve(__dirname, 'lib/nuxt/runtime/plugin.ts')
            },
            formats: ['es'],
            fileName: (_format, entryName) => `nuxt/${entryName}.mjs`
          },
          rollupOptions: {
            external: ['@nuxt/kit', 'defu', 'vue-lite-layer', '#imports']
          },
          emptyOutDir: false
        }
      : {
          lib: {
            entry: resolve(__dirname, 'lib/index.ts'),
            name: 'vue-lite-layer',
            fileName: (format) => `vue-lite-layer.${format}.js`
          },
          rollupOptions: {
            external: ['vue'],
            output: {
              globals: {
                vue: 'Vue'
              }
            }
          }
        }
  }
})
```

- [ ] **Step 6: 运行 Nuxt 构建验证**

Run:

```bash
pnpm lib:build
pnpm type-check
```

Expected:

```text
dist/vue-lite-layer.es.js exists
dist/vue-lite-layer.umd.js exists
dist/index.d.ts exists
dist/nuxt/module.mjs exists
dist/nuxt/module.d.ts exists
dist/nuxt/runtime/plugin.mjs exists
```

- [ ] **Step 7: Nuxt review gate**

调用 `ecc:vue-reviewer` 和 `ecc:typescript-reviewer`，范围限定为：

```text
请审查 lib/nuxt/module.ts、lib/nuxt/runtime/plugin.ts、lib/nuxt/module-options.ts、package.json exports、vite.config.lib.ts。重点检查 Nuxt module 解析、runtimeConfig.public 可序列化边界、类型导出和构建产物路径。
```

- [ ] **Step 8: Checkpoint，不提交**

Run:

```bash
git status --short
```

Expected: 显示 Nuxt 构建和 package export 相关变更；不要运行 `git commit`。

---

## Task 9: 文档更新与最终验证

**Files:**
- Modify: `docs/api/config.md:1-198`
- Modify: `docs/en/api/config.md:1-198`
- Modify: `docs/guide/nuxt.md:1-102`
- Modify: `docs/en/guide/nuxt.md:1-102`
- Modify: `docs/advanced/teleport.md:1-112`
- Modify: `docs/en/advanced/teleport.md:1-102`
- Test: all verification commands

**Interfaces:**
- Consumes: All new public API and behavior from Tasks 2-8.
- Produces: User-facing docs for content security, safe text rendering, callback types, banner config, Nuxt serializable config, teleport key behavior.

- [ ] **Step 1: 更新中文配置文档 `docs/api/config.md` 的 content 和 textContent**

在 `LayerConfig` 表格中将 `content` 行改为：

```markdown
| `content` | `Component \| HTMLElement \| string` | — | 弹层内容：Vue 组件、HTML 元素或 trusted HTML 字符串。字符串会按 HTML 渲染，请勿传入未净化的用户输入 |
| `textContent` | `string` | — | 安全文本内容，按纯文本渲染，优先级高于 `content` |
| `contentType` | `'html' \| 'text'` | `'html'` | 字符串 `content` 的渲染模式；默认保留历史 HTML 行为 |
```

在 `LayerGlobalConfig` 表格加入：

```markdown
| `banner` | `boolean` | `true` | 是否在插件安装时输出版本 banner |
```

将 `LayerCallback` 改为：

```markdown
```typescript
type LayerCallback = (commandOrMessage?: unknown, message?: unknown) => void
```
```

- [ ] **Step 2: 更新英文配置文档 `docs/en/api/config.md`**

替换对应表格行为：

```markdown
| `content` | `Component \| HTMLElement \| string` | — | Layer content: Vue component, HTMLElement, or trusted HTML string. String content is rendered as HTML, so do not pass unsanitized user input |
| `textContent` | `string` | — | Safe plain text content. Takes precedence over `content` |
| `contentType` | `'html' \| 'text'` | `'html'` | Render mode for string `content`; defaults to legacy HTML behavior |
```

加入 banner 行：

```markdown
| `banner` | `boolean` | `true` | Whether to print the version banner during plugin installation |
```

更新 callback：

```markdown
```typescript
type LayerCallback = (commandOrMessage?: unknown, message?: unknown) => void
```
```

- [ ] **Step 3: 更新 Nuxt 中文文档 `docs/guide/nuxt.md`**

在“全局配置”后加入：

```markdown
## Nuxt 配置限制

`vueLiteLayer` 写入 `runtimeConfig.public`，因此只支持可序列化配置：

- `footer` 只支持 `boolean` 或字符串组件名，不支持直接传入组件对象。
- `teleport` 只支持 CSS 选择器字符串或 `'body'`，不支持 `HTMLElement`。
- `i18n.messages` 必须是普通 JSON 对象。

需要传入组件、DOM 元素或函数时，请在客户端组件中调用 `openLayer()` 时传入，而不是放在 `nuxt.config.ts`。
```

- [ ] **Step 4: 更新 Nuxt 英文文档 `docs/en/guide/nuxt.md`**

```markdown
## Nuxt Configuration Limits

`vueLiteLayer` is written to `runtimeConfig.public`, so it only supports serializable configuration:

- `footer` only supports `boolean` or a string component name, not direct component objects.
- `teleport` only supports CSS selector strings or `'body'`, not `HTMLElement`.
- `i18n.messages` must be a plain JSON object.

When you need components, DOM elements, or functions, pass them from a client component via `openLayer()` instead of putting them in `nuxt.config.ts`.
```

- [ ] **Step 5: 更新 Teleport 中文文档 `docs/advanced/teleport.md`**

在“z-index 分组”后加入：

```markdown
当 `teleport` 是 DOM 元素时，Vue Lite Layer 会为该元素生成稳定的内部分组 key。打开、置顶和关闭都使用同一个 key，因此关闭后会正确清理 z-index 记录。

挂载目标建议通过 CSS class 或 inline style 设置定位上下文：

```css
.local-layer-host {
  position: relative;
  height: 600px;
  overflow: hidden;
}
```
```

- [ ] **Step 6: 更新 Teleport 英文文档 `docs/en/advanced/teleport.md`**

```markdown
When `teleport` is a DOM element, Vue Lite Layer generates a stable internal group key for that element. Opening, bringing to top, and closing all use the same key, so z-index records are cleaned up correctly after close.

The mount target should define a positioning context via a CSS class or inline style:

```css
.local-layer-host {
  position: relative;
  height: 600px;
  overflow: hidden;
}
```
```

- [ ] **Step 7: 运行完整验证**

Run:

```bash
pnpm test
pnpm type-check
pnpm lib:build
pnpm build
pnpm docs:build
```

Expected:

```text
All commands exit 0
```

- [ ] **Step 8: 最终代码审查**

并行调用以下代理：

```text
ecc:code-reviewer：审查全部当前 diff，重点看正确性、可维护性、兼容性。
ecc:vue-reviewer：审查 .vue 组件、Composition API、Vue reactivity、Nuxt 集成。
ecc:typescript-reviewer：审查 TypeScript 类型、public API、any/unknown、构建配置。
ecc:security-reviewer：审查 v-html、runtime config、外部输入和 warning 边界。
```

- [ ] **Step 9: 根据审查结果修复 CRITICAL / HIGH 问题**

处理规则：

```text
CRITICAL：必须修复后重新运行完整验证。
HIGH：默认修复；如果不修复，必须写明原因并让用户确认。
MEDIUM：能低风险修复则修复；否则记录为后续建议。
LOW：只修明显无争议项。
```

- [ ] **Step 10: 汇总结果，不提交**

Run:

```bash
git status --short
git diff --stat
```

Expected: 工作区包含本轮优化相关变更；不要运行 `git commit` 或 `git push`，除非用户明确要求。

---

## Self-Review

### Spec coverage

- 测试护栏：Task 1 建立 Vitest、组件测试、类型测试。
- 生命周期与状态清理：Task 2 统一 teleport key、manager remove、实例注册顺序。
- 事件系统：Task 3 类型化 LayerEvents、LayerService、disposer、scope dispose。
- 内容安全边界：Task 4 保留 trusted HTML，新增 `textContent` / `contentType`、HTMLElement 内容支持和 warning。
- a11y：Task 5 添加 dialog 语义、button 语义、footer button type。
- 性能：Task 6 优化拖拽 rAF、尺寸写入和滚动阴影。
- 公共类型：Task 7 导出公共类型、收敛 callback / i18n 类型、控制 banner 副作用。
- Nuxt 发布兼容：Task 8 增加 module options、runtime config 子集和 `dist/nuxt/module.mjs` 导出。
- 文档与验证：Task 9 更新中英文文档并运行完整验证。

### Placeholder scan

计划中没有 `TBD`、`TODO`、`implement later`、`fill in details`。所有新增接口、文件路径、命令和预期结果均已写明。

### Type consistency

- `LayerInstance.teleportKey` 在 Task 2 定义，并被 Task 2 / Task 7 类型测试使用。
- `LayerEvents` 在 Task 3 定义为 mitt 兼容的 `Record<EventType, unknown> & {...}`，并被 `useLayerEvent`、`LiteLayer` 测试和 emitter plugin 使用。
- `textContent` / `contentType` 在 Task 4 定义，并被 Task 4、Task 5、Task 9 使用。
- `ModuleOptions` 在 Task 8 定义，并被 Nuxt runtime plugin 和文档使用。
