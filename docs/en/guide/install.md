# Installation

## Requirements

- **Node.js** >= 18
- **Vue** >= 3.3.0
- **Nuxt** >= 3 (only when using the Nuxt module `vue-lite-layer/nuxt`; both Nuxt 3 and Nuxt 4 are supported)

The `nuxt` and `@nuxt/kit` packages required by the Nuxt module are provided by your Nuxt project and declared as optional peer dependencies, so no extra installation is needed.

## Install via Package Manager

We recommend using **pnpm**:

::: code-group

```bash [pnpm]
pnpm add vue-lite-layer
```

```bash [npm]
npm install vue-lite-layer
```

```bash [yarn]
yarn add vue-lite-layer
```

:::

## Build from Source

To use the latest development version, clone the repository and build manually:

```bash
git clone https://github.com/jktantan/vue-lite-layer.git
cd vue-lite-layer
pnpm install
pnpm lib:build
```

Build output is in the `dist/` directory.

## Next Steps

After installation, see the [Quick Start](./quickstart) guide to learn how to use Vue Lite Layer in your project.
