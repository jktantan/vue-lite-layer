# Interactive Demo

On this page you can experience all Vue Lite Layer features firsthand. Click the buttons to open layers — all layers support drag-to-move and double-click title bar to maximize.

<script setup>
import BasicDemo from '../../components/BasicDemo.vue'
import SizeDemo from '../../components/SizeDemo.vue'
import PositionDemo from '../../components/PositionDemo.vue'
import ShadeDemo from '../../components/ShadeDemo.vue'
import FooterDemo from '../../components/FooterDemo.vue'
import EventDemo from '../../components/EventDemo.vue'
import LoadingDemo from '../../components/LoadingDemo.vue'
import MultiLayerDemo from '../../components/MultiLayerDemo.vue'
import InstanceDemo from '../../components/InstanceDemo.vue'
</script>

## Basic Usage

The simplest usage — open a layer via `openLayer`. Supports both text content and Vue components as content.

<BasicDemo />

::: details View Code
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import MyComponent from './MyComponent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// Component layer with props and onOk callback to receive returned data
openLayer({
  title: 'Component Content Layer',
  content: MyComponent,
  props: { greeting: 'Please fill in your information' },
  size: { width: '450px', height: '320px' },
  onOk: (message) => {
    console.log('Returned data:', message)
  }
}, appContext)
```
:::

## Shade Configuration

Control whether to show the shade via `shade`, and whether clicking the shade closes the layer via `shadeClose`.

<ShadeDemo />

::: details View Code
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// With shade, click to close (default behavior)
openLayer({
  title: 'Click shade to close',
  content: MyComponent,
  shade: true,       // Default: true
  shadeClose: true,  // Default: true
}, appContext)

// With shade, click does NOT close
openLayer({
  title: 'Shade click does not close',
  content: MyComponent,
  shade: true,
  shadeClose: false,  // Can only close via the close button
}, appContext)

// No shade
openLayer({
  title: 'No shade',
  content: MyComponent,
  shade: false,  // No shade overlay, page remains interactive
}, appContext)
```
:::

## Footer Buttons

Configure the footer area via `footer`: `true` shows default buttons, `false` hides, or pass a Vue component for full customization.

<FooterDemo />

::: details View Code
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import CustomFooter from './CustomFooter.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// Default footer buttons
openLayer({
  title: 'Default Buttons',
  content: MyComponent,
  footer: true, // Default, shows OK / Cancel buttons
}, appContext)

// Hidden footer
openLayer({
  title: 'Hidden Footer',
  content: MyComponent,
  footer: false,
}, appContext)

// Custom footer component
openLayer({
  title: 'Custom Footer',
  content: MyComponent,
  footer: CustomFooter,  // Pass a Vue component to replace the default button area
}, appContext)
```

Custom footer component example (using the footer-specific API):

```vue
<!-- CustomFooter.vue -->
<script setup>
import { useLayerEvent } from 'vue-lite-layer'

// Footer-specific: emitOk / emitCancel / emitCommand
const { emitOk, emitCancel, emitCommand, close } = useLayerEvent()

const handleSave = () => {
  emitOk()              // Notify Container: confirm
  close()
}

const handleSaveDraft = () => {
  emitCommand('draft')  // Send custom command
  close()
}

const handleCancel = () => {
  emitCancel()           // Notify Container: cancel
  close()
}
</script>

<template>
  <div class="custom-footer">
    <button @click="handleCancel">Cancel</button>
    <button @click="handleSaveDraft">Save Draft</button>
    <button @click="handleSave">Save & Submit</button>
  </div>
</template>
```
:::

## Custom Size

Set layer size via the `size` property — supports pixel and percentage values. Use `maxWidth` / `maxHeight` to limit the maximum size.

<SizeDemo />

::: details View Code
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// Fixed pixel size
openLayer({
  title: 'Small Layer',
  size: { width: '250px', height: '180px' },
}, appContext)

// Percentage size
openLayer({
  title: 'Large Layer',
  size: { width: '80%', height: '70%' },
}, appContext)

// With max size constraints
openLayer({
  title: 'Max Size Constrained',
  size: { width: '90%', height: '80%' },
  maxWidth: '600px',
  maxHeight: '400px',
}, appContext)
```
:::

## Positioning

Set layer position via the `location` property — supports 9 preset positions and custom coordinates.

<PositionDemo />

::: details View Code
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// Preset position: top left
openLayer({
  title: 'Top Left',
  location: 'LT',
  shade: false,
}, appContext)

// Preset position: center (default)
openLayer({
  title: 'Center',
  location: 'CC',
}, appContext)

// Custom coordinates
openLayer({
  title: 'Custom Coordinates',
  location: { top: '50px', left: '100px' },
  shade: false,
}, appContext)
```
:::

## Event Interaction

Receive interaction results from the layer content component via `onOk` / `onCancel` / `onCommand` callbacks.

<EventDemo />

::: details View Code
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import FormContent from './FormContent.vue'
import CommandContent from './CommandContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// Confirm / Cancel callbacks
openLayer({
  title: 'Event Callbacks',
  content: FormContent,
  onOk: (message) => console.log('Confirmed:', message),
  onCancel: () => console.log('Cancelled'),
}, appContext)

// Custom commands
openLayer({
  title: 'Custom Commands',
  content: CommandContent,
  footer: false,
  onCommand: (command, message) => {
    console.log('Command:', command, 'Data:', message)
  },
}, appContext)
```
:::

## Loading State

Layer content components can control the loading overlay via `useLayerEvent`.

<LoadingDemo />

::: details View Code
```vue
<!-- Layer content component -->
<script setup>
import { useLayerEvent } from 'vue-lite-layer'

const { onOk, startLoading, stopLoading, resolveOk, close } = useLayerEvent()

onOk(async () => {
  startLoading()
  try {
    const result = await saveData() // Async operation
    resolveOk(result)
    close()
  } finally {
    stopLoading()
  }
})
```
:::

## Instance Methods

`openLayer` returns a layer instance object that allows external control of maximize, restore, and close.

<InstanceDemo />

::: details View Code
```vue
<script setup>
import { ref, getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

const instance = ref(null)

// Open and save instance reference
instance.value = openLayer({
  title: 'Controllable Layer',
  shade: false,
  footer: false,
}, appContext)

// External control
instance.value?.maximize()   // Maximize
instance.value?.restore()    // Restore
instance.value?.bringToTop() // Bring to top
instance.value?.close()      // Close
```
:::

## Multi-layer Management

Supports opening multiple layers simultaneously with built-in z-index auto-management. `uniqueGroup` prevents duplicate layers in the same group.

<MultiLayerDemo />

::: details View Code
```vue
<script setup>
import { getCurrentInstance } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'

const { appContext } = getCurrentInstance()!
const { openLayer, closeAllLayer } = useLiteLayer()

// Open multiple shade-free layers, click to bring to top
openLayer({
  title: 'Layer 1',
  shade: false,
  location: { top: '100px', left: '300px' },
}, appContext)

// Unique group: only one per group
const instance = openLayer({
  title: 'Settings',
  uniqueGroup: 'settings',
  shade: false,
}, appContext)

// Opening the same group again returns null
const instance2 = openLayer({
  title: 'Settings',
  uniqueGroup: 'settings',
  shade: false,
}, appContext)
console.log(instance2) // null — same group layer already exists

// Close all layers
closeAllLayer()
```
:::
