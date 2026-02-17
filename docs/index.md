---
layout: home

hero:
  name: Vue Lite Layer
  text: 服务式弹层组件
  tagline: 基于 Vue 3，以编程方式调用弹层，支持拖拽、最大化、自定义内容和 Nuxt SSR。
  image:
    src: /img/logo.svg
  actions:
    - text: 快速上手
      link: /guide/quickstart
    - theme: alt
      text: 在线演示
      link: /demo/
    - theme: alt
      text: GitHub
      link: https://github.com/jktantan/vue-lite-layer

features:
  - title: 服务式调用
    details: 无需在模板中声明组件，通过 JavaScript API 编程式地打开弹层，更灵活地控制弹层生命周期。
  - title: 可拖拽 & 可调整
    details: 弹层支持标题栏拖拽移动，支持最大化/还原切换，双击标题栏快速切换最大化状态。
  - title: 组件即内容
    details: 支持将任意 Vue 组件作为弹层内容，通过 props 传递数据，通过事件系统实现双向通信。
  - title: 多弹层管理
    details: 内置 z-index 自动管理，支持多弹层叠加、点击自动置顶，支持唯一分组防止重复打开。
  - title: Nuxt 兼容
    details: 完整的 SSR 支持，提供 Nuxt 模块自动注册插件和导入 Composables，开箱即用。
  - title: 高度可定制
    details: 支持自定义尺寸、位置、遮罩、按钮、国际化、Teleport 挂载点等，满足各种业务场景。
---
