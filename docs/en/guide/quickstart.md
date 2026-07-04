# Quick Start

## Register the Plugin

Register the Vue Lite Layer plugin in your application entry file:

```typescript
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import VueLiteLayer from 'vue-lite-layer'
import 'vue-lite-layer/dist/vue-lite-layer.css'

const app = createApp(App)
app.use(VueLiteLayer)
app.mount('#app')
```

You can also pass global default configuration when registering:

```typescript
app.use(VueLiteLayer, {
  shade: true,
  shadeClose: true,
  size: { width: '500px', height: '400px' },
  location: 'CC', // Center
  max: true,       // Allow maximize
  close: true,     // Show close button
})
```

## Open Your First Layer

Use the `useLiteLayer` composable in any component to open a layer:

```vue
<script setup lang="ts">
import { useLiteLayer } from 'vue-lite-layer'
import { getCurrentInstance } from 'vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

const handleOpen = () => {
  openLayer({
    title: 'Hello World',
    textContent: 'This is a simple layer content.',
    size: { width: '400px', height: '300px' },
  }, appContext)
}
</script>

<template>
  <button @click="handleOpen">Open Layer</button>
</template>
```

## Use a Vue Component as Content

The `content` property accepts a Vue component, and you can pass data via `props`:

```vue
<!-- MyForm.vue -->
<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

const props = defineProps<{
  userId: number
}>()

const { resolveOk, close } = useLayerEvent()

const handleSubmit = () => {
  // Pass data back to the caller
  resolveOk({ userId: props.userId, status: 'saved' })
  close()
}
</script>

<template>
  <div style="padding: 20px">
    <p>User ID: {{ userId }}</p>
    <button @click="handleSubmit">Submit</button>
  </div>
</template>
```

Open the layer from the caller:

```vue
<script setup lang="ts">
import { useLiteLayer } from 'vue-lite-layer'
import { getCurrentInstance } from 'vue'
import MyForm from './MyForm.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

const handleOpen = () => {
  openLayer({
    title: 'Edit User',
    content: MyForm,
    props: { userId: 123 },
    size: { width: '500px', height: '400px' },
    onOk: (message) => {
      console.log('User submitted:', message)
    }
  }, appContext)
}
</script>
```

## Control the Layer Instance

`openLayer` returns a layer instance object that you can use to control the layer manually:

```typescript
const instance = openLayer({
  title: 'Controllable Layer',
  content: MyComponent,
}, appContext)

// Close manually
instance?.close()

// Bring to top
instance?.bringToTop()

// Maximize
instance?.maximize()

// Restore
instance?.restore()
```

## Close Layers

```typescript
const { openLayer, closeLayer, closeAllLayer } = useLiteLayer()

// Close a specific layer
const instance = openLayer({ title: 'Layer' }, appContext)
closeLayer(instance!)

// Close all layers
closeAllLayer()
```

## Next Steps

- [Configuration Reference](../api/config) — All available options
- [Composables API](../api/composables) — Full API for `useLiteLayer` and `useLayerEvent`
- [Live Demo](../demo/) — Interactive examples
