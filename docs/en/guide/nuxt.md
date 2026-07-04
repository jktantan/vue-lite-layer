# Nuxt Support

Vue Lite Layer provides an official Nuxt module for seamless integration with Nuxt 3 projects.

## Installation

Make sure `vue-lite-layer` is installed:

```bash
pnpm add vue-lite-layer
```

## Configure the Module

Add the module in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['vue-lite-layer/nuxt'],

  // Optional global configuration
  vueLiteLayer: {
    shade: true,
    shadeClose: true,
    size: { width: '500px', height: '400px' },
    location: 'CC',
  }
})
```

## Module Features

The Nuxt module automatically performs the following:

### 1. Auto-register Plugin

Registers the Vue Lite Layer plugin in client mode. Since layers depend on DOM operations, they only run in the browser environment.

### 2. Auto-import Composables

No manual `import` needed — the following composables are available directly in your components:

- `useLiteLayer()` — Layer operations (open, close)
- `useLayerEvent()` — In-layer event interaction

### 3. Auto Transpile

Adds `vue-lite-layer` to Nuxt's build transpile list to ensure the library code is processed correctly.

## Usage Example

```vue
<!-- pages/index.vue -->
<script setup>
// No manual import needed — Nuxt auto-imports
const { openLayer } = useLiteLayer()
const { appContext } = getCurrentInstance()

const handleOpen = () => {
  openLayer({
    title: 'Layer from Nuxt',
    textContent: 'Using Vue Lite Layer in Nuxt is this simple.',
    size: { width: '500px', height: '300px' },
  }, appContext)
}
</script>

<template>
  <button @click="handleOpen">Open Layer</button>
</template>
```

## SSR Considerations

Vue Lite Layer has built-in SSR compatibility:

- **DOM API Protection**: Calls to `document.createElement`, `window.console`, etc. are skipped on the server
- **ResizeObserver**: Only initialized in the `onMounted` hook to avoid server-side errors
- **Client-only**: Layer creation and rendering only run in the browser environment

::: tip
You typically don't need to handle SSR compatibility yourself — the module automatically registers the plugin in `client` mode.
:::

## Global Configuration

Configuration passed via the `vueLiteLayer` field in `nuxt.config.ts` applies as defaults to all layers:

```typescript
export default defineNuxtConfig({
  modules: ['vue-lite-layer/nuxt'],
  vueLiteLayer: {
    shade: true,
    shadeClose: false,     // Disable shade-click-to-close
    max: false,            // Disable maximize button
    location: 'CT',        // Top center
    i18n: { locale: 'en' } // English UI
  }
})
```

These global defaults can be overridden by configuration in individual `openLayer()` calls.

## Nuxt Configuration Limits

`vueLiteLayer` is written to `runtimeConfig.public`, so it only supports serializable configuration. This configuration is exposed to the client, so do not put secrets, tokens, or private security decisions there:

- `footer` only supports `boolean` or a string component name, not direct component objects.
- `teleport` only supports CSS selector strings or `'body'`, not `HTMLElement`.
- `i18n.messages` must be a plain JSON object.

When you need components, DOM elements, or functions, pass them from a client component via `openLayer()` instead of putting them in `nuxt.config.ts`.
