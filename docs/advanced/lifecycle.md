# 关闭、生命周期与异步内容

这一页说明服务式 Layer 最容易和业务流程耦合的部分：何时真正关闭、如何等待关闭结果，以及如何处理异步组件加载。

## 关闭请求与关闭结果

标题栏关闭、遮罩点击、`Esc`、Footer、内容组件的 `close()` 和实例的 `close()` 都会发起关闭请求，并统一经过 `beforeClose`。守卫可以同步或异步返回 `boolean`；返回 `false` 或抛出异常都会保留当前 Layer。

```ts
const instance = openLayer({
  title: '编辑资料',
  beforeClose: async ({ reason }) => {
    if (reason === 'shade' || reason === 'escape') {
      return window.confirm('修改尚未保存，仍要关闭吗？')
    }
    return true
  }
})

const result = await instance?.closed
// result: { action: 'close' | 'ok' | 'cancel', reason: 'header' | 'shade' | ... }
```

`closed` 会在离场动画结束后 resolve，适合在调用方继续后续流程。`reason` 用于判断关闭入口：`header`、`shade`、`escape`、`ok`、`cancel` 或 `programmatic`。

## Footer 与业务完成

默认 Footer 的按钮只负责通知内容组件：确认触发 `onOk()`，取消触发 `onCancel()`。它们不会替业务自动关闭，避免表单校验和异步保存尚未完成时窗口消失。

```vue
<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, resolveOk, close, startLoading, stopLoading } = useLayerEvent()

onOk(async () => {
  startLoading()
  try {
    const saved = await saveForm()
    resolveOk(saved)
    close() // 只有业务确认完成后才关闭
  } finally {
    stopLoading()
  }
})
</script>
```

简单确认框可以设置 `closeOnOk: true`。自定义 Footer 中的 `emitCommand('draft')` 只会通知 `onCommand`，不会关闭；需要关闭时由 Footer 或内容组件显式调用 `close()`。

## 生命周期与动态更新

`onOpen` 在 Layer 挂载时调用，`onOpened` 在入场动画结束时调用；`onClose(context)` 在通过关闭守卫并开始离场时调用，`onClosed(context)` 在离场结束、卸载前调用。即使浏览器没有触发动画事件，Layer 也有动画完成兜底，生命周期不会一直悬挂。

```ts
const instance = openLayer({
  title: '正在处理',
  onOpened: () => console.log('已显示'),
  onClosed: ({ reason }) => console.log('已关闭：', reason)
})

instance?.update({
  title: '处理完成',
  footer: false
})
```

`update()` 只更新打开后可变的展示和业务配置；`id`、`uniqueGroup`、`teleport` 是实例管理信息，打开后不能修改。

## 异步内容与重试

把 `defineAsyncComponent()` 传给 `content` 时，Layer 会显示加载状态。加载失败会显示错误状态和重试按钮；通过 `asyncContent` 配置文案、超时、次数和延迟。

```ts
const AsyncEditor = defineAsyncComponent(() => import('./Editor.vue'))

openLayer({
  title: '编辑器',
  content: AsyncEditor,
  asyncContent: {
    loadingText: '正在加载编辑器…',
    errorText: '加载失败，请检查网络后重试',
    retryText: '重新加载',
    timeout: 10_000,
    maxRetries: 3,
    retryDelay: 500,
    onError: (error) => reportError(error),
    onTimeout: () => reportTimeout()
  }
})
```

`maxRetries` 省略时不限制手动重试；`retryDelay` 省略时立即重试。关闭 Layer 会清理 Layer 创建的超时和重试定时器；异步组件 loader 中的网络请求若需取消，请由业务请求层使用 `AbortController` 等方式处理。

## 无障碍默认行为

Layer 默认响应 `Esc`、将 `Tab` 焦点限制在窗口内，并在关闭当前顶层 Layer 时恢复之前焦点。可分别通过 `closeOnEsc`、`trapFocus` 和 `restoreFocus` 关闭这些行为。Teleport 到 `body` 且启用遮罩时会锁定页面滚动，多层打开时会在最后一个相关 Layer 关闭后恢复。

详细字段请查看 [配置项](../api/config) 和 [弹层实例](../api/instance)。
