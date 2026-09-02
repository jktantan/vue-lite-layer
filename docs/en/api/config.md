# Configuration

## LayerGlobalConfig

Global configuration passed via `app.use(VueLiteLayer, globalConfig)`, serving as defaults for all layers.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `footer` | `boolean \| string \| Component` | `true` | Footer area: `true` shows default buttons, `false` hides, pass a string or component for custom footer |
| `shade` | `boolean` | `true` | Whether to show the shade overlay |
| `shadeClose` | `boolean` | `true` | Whether clicking the shade closes the layer |
| `maxWidth` | `string` | `'none'` | Maximum width (CSS value, e.g. `'800px'`, `'90%'`) |
| `maxHeight` | `string` | `'none'` | Maximum height (CSS value) |
| `size` | `WindowSize` | `{ width: '300px', height: '400px' }` | Default layer size |
| `location` | `PositionPreset \| Position` | `'CC'` | Layer position, see below |
| `teleport` | `string \| HTMLElement \| RendererNode` | `'body'` | Teleport target, CSS selector or DOM element |
| `max` | `boolean` | `true` | Whether to allow maximize |
| `close` | `boolean` | `true` | Whether to show the close button |
| `closeOnOk` | `boolean` | `false` | Whether OK in the default footer closes automatically; keep `false` for async forms |
| `closeOnEsc` | `boolean` | `true` | Whether `Esc` requests closing the layer |
| `trapFocus` | `boolean` | `true` | Whether `Tab` focus is kept inside the layer |
| `restoreFocus` | `boolean` | `true` | Whether to restore focus after the top layer closes |
| `i18n` | `{ locale?: string; messages?: object }` | `{ locale: 'zh-CN' }` | Internationalization configuration |
| `asyncContent` | `AsyncContentConfig` | — | Loading, failure and retry presentation for async content |
| `banner` | `boolean` | `true` | Whether to print the version banner during plugin installation |

## LayerConfig

Per-layer configuration passed via `openLayer(config, appContext)`. Inherits all `LayerGlobalConfig` properties and adds the following layer-specific ones:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | Auto-generated | Unique layer identifier, usually no need to set manually |
| `uniqueGroup` | `string` | — | Unique group identifier; only one layer per group can be open |
| `title` | `string` | `''` | Layer title |
| `content` | `Component \| HTMLElement \| string` | — | Layer content: Vue component, HTMLElement, or trusted HTML string. String content is rendered as HTML, so do not pass unsanitized user input. HTMLElement content is moved into the layer and restored to its original DOM position on content switch or unmount when possible |
| `textContent` | `string` | — | Safe plain text content. Takes precedence over `content` |
| `contentType` | `'html' \| 'text'` | `'html'` | Render mode for string `content`; defaults to legacy HTML behavior |
| `props` | `object \| null` | `null` | Props to pass to the content component |
| `onOk` | `LayerCallback \| null` | `null` | Confirm callback, receives data from the content component |
| `onCancel` | `LayerCallback \| null` | `null` | Cancel callback |
| `onCommand` | `LayerCallback \| null` | `null` | Custom command callback |
| `beforeClose` | `(context) => boolean \| Promise<boolean>` | `null` | Close guard; return `false` to keep the layer open |
| `onOpen` / `onOpened` | `() => void` | `null` | Called on mount / after enter animation |
| `onClose` / `onClosed` | `(context) => void` | `null` | Called when closing begins / after leave completes |

::: warning HTML content security
String `content` is for trusted HTML, and runtime rendering does not sanitize HTML for you. Prefer `textContent` or `contentType: 'text'` for plain text or user input. If you must render rich user content, sanitize it with a trusted sanitizer first.
::: 

## Close Control and Accessibility

All close paths (header, shade, `Esc`, footer and instance `close()`) pass through `beforeClose`, including asynchronous guards:

```ts
openLayer({
  beforeClose: async ({ reason }) =>
    reason === 'shade' ? window.confirm('Discard unsaved changes?') : true
}, appContext)
```

Layers focus themselves on open, trap `Tab` by default, and restore focus when the active top layer closes. A shaded layer teleported to `body` locks page scroll; nested layers use reference counting and restore page styles after the final close.

## Async Content

`defineAsyncComponent()` content shows a loading state and a retry UI on failure:

```ts
openLayer({
  content: AsyncEditor,
  asyncContent: {
    loadingText: 'Loading editor…',
    errorText: 'Editor failed to load',
    retryText: 'Retry',
    timeout: 10_000,
    maxRetries: 3,
    retryDelay: 500,
    onError: reportError
  }
}, appContext)
```

`timeout` is the loading timeout in milliseconds; omit it to disable timeout. `maxRetries` limits manual retries and `retryDelay` delays a retry. Use `onTimeout` and `onRetry(retryCount)` for observability. Closing a Layer clears library-owned timeout/retry timers; aborting the async loader itself remains the responsibility of the request layer, for example with `AbortController`.

## Footer Details

The `footer` property controls the layer's bottom button area, supporting three modes:

### Default Buttons (`footer: true`)

Shows the built-in "OK" and "Cancel" buttons. Clicking a button triggers internal `ok` / `cancel` events, which the content component can listen for via `useLayerEvent`'s `onOk` / `onCancel`.

The default footer only emits `ok` / `cancel`; it does not close the Layer directly. Content or a custom footer must call `close()` explicitly. Use `closeOnOk: true` only for simple confirmations.

```typescript
openLayer({
  title: 'Default Buttons',
  content: MyComponent,
  footer: true, // Default
}, appContext)
```

### Hidden (`footer: false`)

Does not render the footer area. Suitable when the content component has its own action buttons, or when showing information only.

```typescript
openLayer({
  title: 'No Footer',
  content: MyComponent,
  footer: false,
}, appContext)
```

### Custom Component (`footer: Component`)

Pass a Vue component to fully replace the default button area. Custom footer components use the footer-specific API (`emitOk` / `emitCancel` / `emitCommand`) to interact with the layer:

```vue
<!-- CustomFooter.vue -->
<script setup>
import { useLayerEvent } from 'vue-lite-layer'

// Footer-specific API
const { emitOk, emitCancel, emitCommand, close } = useLayerEvent()

const handleSave = () => {
  emitOk()              // Notify Container: confirm
  close()
}
const handleCancel = () => {
  emitCancel()           // Notify Container: cancel
  close()
}
</script>

<template>
  <div style="display: flex; justify-content: flex-end; padding: 10px; gap: 8px; border-top: 1px solid #f0f0f0;">
    <button @click="handleCancel">Cancel</button>
    <button @click="handleSave">Save</button>
  </div>
</template>
```

Using the custom footer component:

```typescript
import CustomFooter from './CustomFooter.vue'

openLayer({
  title: 'Custom Footer',
  content: MyComponent,
  footer: CustomFooter,
}, appContext)
```

## Shade / ShadeClose Details

`shade` and `shadeClose` work together to control the overlay behavior:

| shade | shadeClose | Effect |
| --- | --- | --- |
| `true` | `true` | Show shade, clicking shade closes the layer (default) |
| `true` | `false` | Show shade, clicking shade does NOT close (for critical operations) |
| `false` | — | No shade, page remains interactive |

```typescript
// With shade, click to close (default)
openLayer({ shade: true, shadeClose: true, ... }, appContext)

// With shade, click does NOT close
openLayer({ shade: true, shadeClose: false, ... }, appContext)

// No shade
openLayer({ shade: false, ... }, appContext)
```

::: tip
When `shade: false`, the layer does not block page interaction. You can open multiple shade-free layers that stack on top of each other.
:::

## WindowSize

Layer size type, accepts CSS string values:

```typescript
interface WindowSize {
  width?: string   // e.g. '500px', '80%'
  height?: string  // e.g. '400px', '60%'
}
```

## PositionPreset

Position preset enum values, in `ColumnRow` format:

| Value | Description |
| --- | --- |
| `'LT'` | Top Left |
| `'LC'` | Left Center |
| `'LB'` | Bottom Left |
| `'CT'` | Top Center |
| `'CC'` | Center (default) |
| `'CB'` | Bottom Center |
| `'RT'` | Top Right |
| `'RC'` | Right Center |
| `'RB'` | Bottom Right |

You can also pass a custom coordinate object:

```typescript
interface Position {
  top: string   // CSS top value, e.g. '100px'
  left: string  // CSS left value, e.g. '200px'
}
```

## LayerCallback

Layer callback function type:

```typescript
type LayerCallback = (commandOrMessage?: unknown, message?: unknown) => void
```

## Configuration Priority

Configuration merge priority (from highest to lowest):

1. Configuration passed in the `openLayer()` call
2. Global configuration passed in `app.use(VueLiteLayer, globalConfig)`
3. Built-in defaults (`defaultConfig`)

```typescript
// Built-in defaults
{
  teleport: 'body',
  size: { width: '300px', height: '400px' },
  footer: true,
  shade: true,
  shadeClose: true,
  maxWidth: 'none',
  maxHeight: 'none',
  location: 'CC',
  max: true,
  close: true,
  closeOnOk: false,
  closeOnEsc: true,
  trapFocus: true,
  restoreFocus: true,
  i18n: { locale: 'zh-CN' },
  banner: true
}
```
