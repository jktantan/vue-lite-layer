# Composables

Vue Lite Layer provides two core composable functions.

## useLiteLayer

**Purpose:** Control layer opening and closing from any component.

### Return Value

| Method | Type | Description |
| --- | --- | --- |
| `openLayer` | `(options?: LayerConfig, appContext?: AppContext) => LayerInstance \| null` | Open a layer |
| `closeLayer` | `(instance: LayerInstance) => void` | Close a specific layer |
| `closeAllLayer` | `() => void` | Close all layers |

### openLayer

Open a layer and return the layer instance object.

**Parameters:**
- `options` — Layer configuration, see [Configuration](./config)
- `appContext` — Host application context, used to share globally registered components, directives, etc.

**Returns:** `LayerInstance | null` — Returns a layer instance on success, `null` on failure (SSR environment or unique group conflict)

::: warning About appContext
The `appContext` parameter allows components inside the layer to access globally registered components and plugins. If the layer content needs global components (such as UI library components), make sure to pass this parameter.
:::

```vue
<script setup>
import { useLiteLayer } from 'vue-lite-layer'
import { getCurrentInstance } from 'vue'

const { appContext } = getCurrentInstance()!
const { openLayer, closeLayer, closeAllLayer } = useLiteLayer()

// Open a layer
const instance = openLayer({
  title: 'Layer Title',
  content: 'Content text',
}, appContext)

// Close a specific layer
closeLayer(instance!)

// Close all layers
closeAllLayer()
</script>
```

---

## useLayerEvent

**Purpose:** Used within layer content components to provide event interaction capabilities with the layer.

::: tip
This composable only works inside layer content components, as it depends on the event bus provided by the layer instance.
:::

### Return Value

#### Footer Specific (Notify Container of Button Clicks)

| Method | Type | Description |
| --- | --- | --- |
| `emitOk` | `() => void` | Trigger confirm event |
| `emitCancel` | `() => void` | Trigger cancel event |
| `emitCommand` | `(command?: any) => void` | Trigger custom command |

#### Container: Listen for Footer Events

| Method | Type | Description |
| --- | --- | --- |
| `onOk` | `(callback?: LayerCallback) => void` | Listen for confirm button click |
| `onCancel` | `(callback?: LayerCallback) => void` | Listen for cancel button click |
| `onCommand` | `(callback?: LayerCallback) => void` | Listen for custom command |

#### Container: Pass Processing Results to Caller

| Method | Type | Description |
| --- | --- | --- |
| `resolveOk` | `(message?: any) => void` | Confirm complete, pass result to `onOk` callback |
| `resolveCancel` | `(message?: any) => void` | Cancel complete, pass result to `onCancel` callback |
| `resolveCommand` | `(command: string, message?: any) => void` | Command complete, pass result to `onCommand` callback |

#### Loading Control

| Method | Type | Description |
| --- | --- | --- |
| `startLoading` | `() => void` | Show loading overlay |
| `stopLoading` | `() => void` | Hide loading overlay |

#### General

| Method | Type | Description |
| --- | --- | --- |
| `close` | `() => void` | Directly close the layer |

### Event Flow

The layer event system follows this flow:

1. **User clicks the confirm button** → Footer triggers `ok` event via `emitOk()`
2. **Content component listens via `onOk`** → Executes business logic (e.g. form validation)
3. **Content component calls `resolveOk(data)`** → Passes the result back to the caller's `onOk` callback
4. **Content component calls `close()`** → Closes the layer

### Basic Example

```vue
<!-- FormContent.vue - Layer content component -->
<script setup lang="ts">
import { ref } from 'vue'
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, onCancel, resolveOk, close } = useLayerEvent()

const formData = ref({ name: '', email: '' })

// Listen for confirm button
onOk(() => {
  // Validate the form
  if (!formData.value.name) {
    alert('Please enter a name')
    return
  }
  // Validation passed, return data and close
  resolveOk(formData.value)
  close()
})

// Listen for cancel button
onCancel(() => {
  close()
})
</script>

<template>
  <div style="padding: 20px">
    <div>
      <label>Name:</label>
      <input v-model="formData.name" />
    </div>
    <div>
      <label>Email:</label>
      <input v-model="formData.email" />
    </div>
  </div>
</template>
```

Caller:

```typescript
openLayer({
  title: 'New User',
  content: FormContent,
  size: { width: '500px', height: '350px' },
  onOk: (message) => {
    console.log('Form data:', message)
    // { name: 'xxx', email: 'xxx@example.com' }
  }
}, appContext)
```

### Loading State

```vue
<!-- AsyncContent.vue -->
<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, startLoading, stopLoading, resolveOk, close } = useLayerEvent()

onOk(async () => {
  startLoading()
  try {
    const result = await saveData()
    resolveOk(result)
    close()
  } catch (error) {
    alert('Save failed')
  } finally {
    stopLoading()
  }
})
</script>
```

### Custom Commands

Custom commands allow content components to emit arbitrary event types:

```vue
<!-- CommandContent.vue -->
<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

const { resolveCommand } = useLayerEvent()

const handleExport = () => {
  resolveCommand('export', { format: 'pdf' })
}

const handlePrint = () => {
  resolveCommand('print', { copies: 1 })
}
</script>

<template>
  <div>
    <button @click="handleExport">Export PDF</button>
    <button @click="handlePrint">Print</button>
  </div>
</template>
```

Caller:

```typescript
openLayer({
  title: 'Document Actions',
  content: CommandContent,
  onCommand: (command, message) => {
    switch (command) {
      case 'export':
        console.log('Export format:', message.format)
        break
      case 'print':
        console.log('Print copies:', message.copies)
        break
    }
  }
}, appContext)
```
