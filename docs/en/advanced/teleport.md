# Teleport Mounting

By default, layers are rendered under the `<body>` element via Vue's `<Teleport>`. You can use the `teleport` option to mount layers to any DOM element.

## Default Behavior

```typescript
openLayer({
  title: 'Mounted to body by default',
  content: MyComponent,
  teleport: 'body', // Default
}, appContext)
```

Layers use `position: fixed` to cover the entire viewport.

## Custom Mount Point

### Using CSS Selector

```typescript
openLayer({
  title: 'Mount to a specific container',
  content: MyComponent,
  teleport: '#my-container',
}, appContext)
```

### Using DOM Element

```typescript
const container = document.getElementById('my-container')

openLayer({
  title: 'Mount to DOM element',
  content: MyComponent,
  teleport: container,
}, appContext)
```

## Local Layers

When `teleport` points to a non-body element, the layer behavior changes as follows:

| Feature | Body Mount | Custom Mount |
| --- | --- | --- |
| Positioning | `position: fixed` | `position: absolute` |
| Coverage | Entire viewport | Parent container |
| Size Reference | Viewport size | Parent container size |

### Parent Container Requirements

The mount target's parent element should have one of the following styles:

- `position: relative` — The layer positions relative to the parent, using `100%` for sizing
- Other positioning — The layer calculates offset via `offsetTop` / `offsetLeft`

### Example

```vue
<template>
  <div class="page-layout">
    <div class="sidebar">Sidebar</div>
    <div id="main-content" style="position: relative; height: 600px; overflow: hidden;">
      <!-- Layers will render inside this container -->
      Main Content
    </div>
  </div>
</template>

<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

const openLocalLayer = () => {
  openLayer({
    title: 'Local Layer',
    textContent: 'This layer only appears within the main-content container.',
    teleport: '#main-content',
    size: { width: '80%', height: '60%' },
  }, appContext)
}
</script>
```

## z-index Grouping

Vue Lite Layer groups layers by their Teleport target for z-index management. Layers under the same Teleport target share a z-index sequence — click-to-top and auto z-index assignment are calculated independently within each group.

```typescript
// These two layers belong to the same z-index group
openLayer({ teleport: '#container-a', ... }, appContext)
openLayer({ teleport: '#container-a', ... }, appContext)

// This layer belongs to a different group
openLayer({ teleport: '#container-b', ... }, appContext)
```

When `teleport` is a DOM element, Vue Lite Layer generates a stable internal group key (`LayerInstance.teleportKey`) for that element. Opening, bringing to top, and closing all use the same key, so z-index records are cleaned up correctly after close.

::: tip The `teleportTarget` instance field
`LayerInstance.teleportTarget` is the user-facing string field: it carries the CSS selector or `'body'` when `teleport` is a string, and is the **empty string** when `teleport` is an `HTMLElement` / `RendererNode` (a DOM node has no stable string form). **To distinguish Teleport groups or track an instance's mount target, read `LayerInstance.teleportKey`** — it is stable across all teleport types.
:::

The mount target should define a positioning context via a CSS class or inline style:

```css
.local-layer-host {
  position: relative;
  height: 600px;
  overflow: hidden;
}
```

## Global Setting

You can set a default Teleport target in the global configuration:

```typescript
app.use(VueLiteLayer, {
  teleport: '#app',  // All layers mount to #app by default
})
```

Per-layer `teleport` configuration overrides the global setting.

## SSR and Hosts Without `document.body`

Layers teleported to `body` are skipped entirely in SSR environments — `openLayer()` returns `null` instead of attempting to create DOM. When `document.body` is missing at runtime, scroll locking and any other `body`-dependent operation silently no-ops rather than throwing.
