# Layer Instance

Each call to `openLayer()` returns a `LayerInstance` object that can be used to manually control the layer.

## LayerInstance

```typescript
interface LayerInstance {
  /** Unique layer identifier */
  id: string

  /** Unique group identifier; undefined when no uniqueGroup is configured */
  uniqueGroup?: string

  /** Teleport target selector, kept for backward compatibility */
  teleportTarget: string

  /** Normalized Teleport key for internal grouping and cleanup */
  teleportKey: string

  /** Close the layer */
  close: () => boolean

  /** Bring the layer to top */
  bringToTop: () => void

  /** Maximize the layer */
  maximize: () => void

  /** Restore the layer size */
  restore: () => void

  /** Update mutable options through normal Vue props */
  update: (options: Partial<LayerConfig>) => void

  /** Resolves with the close result after the leave animation */
  closed: Promise<LayerCloseResult>
}
```

::: tip Teleport metadata
`teleportTarget` is kept for backward compatibility with older instance fields. New code that needs to distinguish `HTMLElement` Teleport groups should read the stable `teleportKey`. When no `uniqueGroup` is configured, `uniqueGroup` is `undefined`.
:::

## Methods

### close()

Close the layer. Triggers the leave animation; after the animation completes, the layer instance is automatically destroyed and DOM is cleaned up.

```typescript
const instance = openLayer({ title: 'Layer' })

// Auto-close after 3 seconds
setTimeout(() => {
  instance?.close()
}, 3000)
```

**Returns:** `boolean` — Always returns `true`

### bringToTop()

Bring the layer to the top. Among all layers under the same Teleport parent, raises this layer's z-index to the highest.

```typescript
instance?.bringToTop()
```

::: tip
Clicking the layer window automatically triggers bring-to-top. You usually don't need to call this method manually.
:::

### maximize()

Maximize the layer. The layer will fill its container (body or custom teleport target).

```typescript
instance?.maximize()
```

### restore()

Restore the layer from maximized state to its default size and position.

```typescript
instance?.restore()
```

### update()

Update mutable options through Vue's normal parent-to-child props path. `id`, `uniqueGroup`, and `teleport` are immutable after opening.

```ts
instance?.update({ title: 'Edit user (unsaved)', size: { width: '720px', height: '520px' } })
```

### closed

Await the completed close result for Promise-style confirmation flows:

```ts
const instance = openLayer({ title: 'Confirm', closeOnOk: true })
const result = await instance?.closed
if (result?.action === 'ok') {
  // confirmed
}
```

`action` is `close`, `ok`, or `cancel`; `reason` identifies `header`, `shade`, `escape`, `ok`, `cancel`, or `programmatic`.

## Usage Example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import MyContent from './MyContent.vue'

const { openLayer } = useLiteLayer()

// Save layer instance reference
const layerInstance = ref<ReturnType<typeof openLayer>>(null)

const handleOpen = () => {
  layerInstance.value = openLayer({
    title: 'Controllable Layer',
    content: MyContent,
    size: { width: '600px', height: '400px' },
  })
}

const handleMaximize = () => {
  layerInstance.value?.maximize()
}

const handleRestore = () => {
  layerInstance.value?.restore()
}

const handleClose = () => {
  layerInstance.value?.close()
  layerInstance.value = null
}
</script>

<template>
  <button @click="handleOpen">Open Layer</button>
  <button @click="handleMaximize">Maximize</button>
  <button @click="handleRestore">Restore</button>
  <button @click="handleClose">Close</button>
</template>
```

## Unique Group

Use `uniqueGroup` to ensure only one layer can be open per group:

```typescript
// First call: opens normally
const instance1 = openLayer({
  title: 'Settings',
  content: SettingsPanel,
  uniqueGroup: 'settings',
})

// Second call: returns null, won't open a duplicate
const instance2 = openLayer({
  title: 'Settings',
  content: SettingsPanel,
  uniqueGroup: 'settings',
})

console.log(instance2) // null
```
