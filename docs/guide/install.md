# 安装

## 环境要求

- **Node.js** >= 18
- **Vue** >= 3.3.0

## 包管理器安装

推荐使用 **pnpm** 安装：

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

## 从源码构建

如果你想使用最新的开发版本，可以从 GitHub 克隆仓库并手动构建：

```bash
git clone https://github.com/jktantan/vue-lite-layer.git
cd vue-lite-layer
pnpm install
pnpm lib:build
```

构建产物位于 `dist/` 目录下。

## 下一步

安装完成后，请参阅 [快速上手](./quickstart) 了解如何在项目中使用 Vue Lite Layer。
