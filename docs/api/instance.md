# 弹层实例

每次调用 `openLayer()` 后会返回一个 `LayerInstance` 对象，可用于手动控制弹层。

## LayerInstance

```typescript
interface LayerInstance {
  /** 弹层唯一标识 */
  id: string

  /** 唯一分组标识；未配置 uniqueGroup 时为空 */
  uniqueGroup?: string

  /** Teleport 目标选择器；为兼容旧版保留 */
  teleportTarget: string

  /** 归一化 Teleport key，用于内部分组和清理 */
  teleportKey: string

  /** 关闭弹层 */
  close: () => boolean

  /** 将弹层置顶 */
  bringToTop: () => void

  /** 最大化弹层 */
  maximize: () => void

  /** 还原弹层尺寸 */
  restore: () => void

  /** 更新打开后的可变配置 */
  update: (options: Partial<LayerConfig>) => void

  /** 离场完成后 resolve 关闭结果 */
  closed: Promise<LayerCloseResult>
}
```

::: tip Teleport 元数据
`teleportTarget` 保留用于兼容旧版实例字段；新代码如需区分 `HTMLElement` Teleport 分组，应读取稳定的 `teleportKey`。未传入 `uniqueGroup` 时，`uniqueGroup` 为 `undefined`。
:::

## 方法说明

### close()

关闭弹层。触发弹层的离场动画，动画完成后自动销毁弹层实例并清理 DOM。

```typescript
const instance = openLayer({ title: '弹层' }, appContext)

// 3 秒后自动关闭
setTimeout(() => {
  instance?.close()
}, 3000)
```

**返回值：** `boolean` — 始终返回 `true`

### bringToTop()

将弹层置顶。在同一个 Teleport 父容器下的所有弹层中，将当前弹层的 z-index 提升到最高。

```typescript
instance?.bringToTop()
```

::: tip
点击弹层窗体时会自动触发置顶，通常不需要手动调用此方法。
:::

### maximize()

最大化弹层。弹层将充满其所在的容器（body 或自定义 teleport 目标）。

```typescript
instance?.maximize()
```

### restore()

将弹层从最大化状态还原到默认尺寸和位置。

```typescript
instance?.restore()
```

### update()

通过标准 Vue 父子 props 更新链路修改已打开 Layer 的可变配置。`id`、`uniqueGroup` 和 `teleport` 用于实例管理，打开后不会被修改。

```ts
instance?.update({
  title: '编辑用户（未保存）',
  props: { userId: '42', readonly: false },
  size: { width: '720px', height: '520px' }
})
```

### closed

等待离场动画结束后获得关闭结果，可用于 Promise 风格的确认流程：

```ts
const instance = openLayer({ title: '确认操作', closeOnOk: true }, appContext)
const result = await instance?.closed

if (result?.action === 'ok') {
  // 用户确认
}
```

`action` 为 `close`、`ok` 或 `cancel`；`reason` 会标记 `header`、`shade`、`escape`、`ok`、`cancel` 或 `programmatic`。

## 使用示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import { getCurrentInstance } from 'vue'
import MyContent from './MyContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()

// 保存弹层实例引用
const layerInstance = ref<ReturnType<typeof openLayer>>(null)

const handleOpen = () => {
  layerInstance.value = openLayer({
    title: '可控弹层',
    content: MyContent,
    size: { width: '600px', height: '400px' },
  }, appContext)
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
  <button @click="handleOpen">打开弹层</button>
  <button @click="handleMaximize">最大化</button>
  <button @click="handleRestore">还原</button>
  <button @click="handleClose">关闭</button>
</template>
```

## 唯一分组

通过 `uniqueGroup` 可以确保同一组只能打开一个弹层：

```typescript
// 第一次调用：正常打开
const instance1 = openLayer({
  title: '设置',
  content: SettingsPanel,
  uniqueGroup: 'settings',
}, appContext)

// 第二次调用：返回 null，不会重复打开
const instance2 = openLayer({
  title: '设置',
  content: SettingsPanel,
  uniqueGroup: 'settings',
}, appContext)

console.log(instance2) // null
```
