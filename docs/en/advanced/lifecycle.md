# Close, Lifecycle, and Async Content

This page covers the service-style Layer behavior that most often interacts with application flows: deciding when a Layer actually closes, awaiting its result, and loading async components.

## Close Requests and Results

Header close, shade click, `Esc`, Footer actions, a content component's `close()`, and an instance's `close()` all request closing through `beforeClose`. The guard may synchronously or asynchronously return a `boolean`; returning `false` or rejecting keeps the Layer open.

```ts
const instance = openLayer({
  title: 'Edit profile',
  beforeClose: async ({ reason }) => {
    if (reason === 'shade' || reason === 'escape') {
      return window.confirm('Unsaved changes will be lost. Close anyway?')
    }
    return true
  }
})

const result = await instance?.closed
// result: { action: 'close' | 'ok' | 'cancel', reason: 'header' | 'shade' | ... }
```

`closed` resolves after the leave animation, so the caller can safely continue its flow. `reason` identifies the close entry point: `header`, `shade`, `escape`, `ok`, `cancel`, or `programmatic`.

## Footer and Business Completion

Default Footer buttons only notify the content component: OK triggers `onOk()` and Cancel triggers `onCancel()`. They do not close on behalf of business logic, so a window cannot disappear before validation or an async save finishes.

```vue
<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, resolveOk, close, startLoading, stopLoading } = useLayerEvent()

onOk(async () => {
  startLoading()
  try {
    const saved = await saveForm()
    resolveOk(saved)
    close() // Close only after business completion
  } finally {
    stopLoading()
  }
})
</script>
```

Use `closeOnOk: true` for a simple confirmation dialog. In a custom Footer, `emitCommand('draft')` only notifies `onCommand`; it stays open unless the Footer or content explicitly calls `close()`.

## Lifecycle and Dynamic Updates

`onOpen` runs when the Layer mounts and `onOpened` runs after the enter animation. `onClose(context)` runs after the close guard allows the request and the leave animation begins; `onClosed(context)` runs after leave completion and before unmount. Layer has an animation fallback, so lifecycle hooks do not remain pending if the browser does not emit an animation event.

```ts
const instance = openLayer({
  title: 'Processing',
  onOpened: () => console.log('visible'),
  onClosed: ({ reason }) => console.log('closed:', reason)
})

instance?.update({
  title: 'Completed',
  footer: false
})
```

`update()` only updates mutable presentation and business options. `id`, `uniqueGroup`, and `teleport` are instance-management fields and cannot change after opening.

## Async Content and Retry

When a `defineAsyncComponent()` is passed as `content`, Layer displays a loading state. A loading failure displays an error state and retry button. Use `asyncContent` to configure text, timeout, retry count, and delay.

```ts
const AsyncEditor = defineAsyncComponent(() => import('./Editor.vue'))

openLayer({
  title: 'Editor',
  content: AsyncEditor,
  asyncContent: {
    loadingText: 'Loading editor…',
    errorText: 'Could not load the editor. Check your network and retry.',
    retryText: 'Retry',
    timeout: 10_000,
    maxRetries: 3,
    retryDelay: 500,
    onError: (error) => reportError(error),
    onTimeout: () => reportTimeout()
  }
})
```

Omit `maxRetries` for unlimited manual retries; omit `retryDelay` to retry immediately. Closing a Layer clears timers created by Layer for timeout and retry. If the async component loader's own network request must be cancelled, handle it in the request layer with `AbortController` or a comparable mechanism.

## Default Accessibility Behavior

By default, Layer responds to `Esc`, traps `Tab` focus inside the window, and restores the previous focus when the top Layer closes. Disable these independently with `closeOnEsc`, `trapFocus`, and `restoreFocus`. A shaded Layer teleported to `body` locks page scrolling; with multiple Layers, it restores scrolling after the last relevant Layer closes.

See [Configuration](../api/config) and [Layer Instance](../api/instance) for field-level details.
