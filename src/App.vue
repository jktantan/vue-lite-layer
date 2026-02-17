<script setup lang="ts">
import { getCurrentInstance, ref, defineComponent, h } from 'vue'
import useLiteLayer from '../lib/composables/use-lite-layer'
import useLayerEvent from '../lib/composables/use-layer-event'

const { appContext } = getCurrentInstance()!
const { openLayer, closeAllLayer } = useLiteLayer()

const log = ref<string[]>([])
const addLog = (msg: string) => {
  log.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
  if (log.value.length > 30) log.value.pop()
}

// Simple text content component
const TextContent = defineComponent({
  props: { text: { type: String, default: '' } },
  setup(props) {
    return () => h('div', { style: 'padding: 20px; font-size: 14px; color: #303133; line-height: 1.8' }, props.text)
  },
})

// ---------- Test 1: Basic open/close animation ----------
const testOpenClose = () => {
  addLog('Opening layer...')
  const inst = openLayer(
    {
      title: 'Test: Open / Close Animation',
      content: TextContent,
      props: { text: 'This layer should have an open animation (scale + fade in). Close it to see the close animation.' },
      size: { width: '450px', height: '250px' },
    },
    appContext
  )
  if (inst) addLog('Layer opened, id=' + inst.id)
  else addLog('ERROR: openLayer returned null')
}

// ---------- Test 2: Loading animation ----------
const LoadingContent = defineComponent({
  setup() {
    const { onOk, onCancel, startLoading, stopLoading, resolveOk, close } = useLayerEvent()
    const status = ref('Ready. Click OK to trigger loading.')

    onOk(async () => {
      status.value = 'Loading...'
      startLoading()
      await new Promise((r) => setTimeout(r, 2000))
      stopLoading()
      status.value = 'Done!'
      resolveOk({ time: new Date().toLocaleTimeString() })
      close()
    })

    onCancel(() => close())

    return () =>
      h('div', { style: 'padding:20px;font-size:14px' }, [
        h('p', `Status: ${status.value}`),
        h('p', { style: 'color:#999;margin-top:12px' }, 'Click OK → 2s loading spinner should appear and rotate.'),
      ])
  },
})

const testLoading = () => {
  addLog('Opening loading test layer...')
  openLayer(
    {
      title: 'Test: Loading Animation',
      content: LoadingContent,
      size: { width: '450px', height: '250px' },
      onOk: (msg: any) => addLog('onOk result: ' + JSON.stringify(msg)),
    },
    appContext
  )
}

// ---------- Test 3: Maximize / Restore animation ----------
const testMaximize = () => {
  addLog('Opening maximize test layer...')
  const inst = openLayer(
    {
      title: 'Test: Maximize / Restore (double-click title bar)',
      content: TextContent,
      props: { text: 'Double-click the title bar to maximize, double-click again to restore. Both should animate smoothly.' },
      size: { width: '450px', height: '250px' },
      shade: false,
    },
    appContext
  )
  if (inst) addLog('Layer opened, id=' + inst.id)
}

// ---------- Test 4: No shade (multiple layers) ----------
const testMultiple = () => {
  addLog('Opening 3 layers without shade...')
  openLayer({ title: 'Layer A', content: TextContent, props: { text: 'Layer A content' }, shade: false, size: { width: '300px', height: '200px' }, location: { top: '80px', left: '80px' } }, appContext)
  openLayer({ title: 'Layer B', content: TextContent, props: { text: 'Layer B content' }, shade: false, size: { width: '300px', height: '200px' }, location: { top: '140px', left: '200px' } }, appContext)
  openLayer({ title: 'Layer C', content: TextContent, props: { text: 'Layer C content' }, shade: false, size: { width: '300px', height: '200px' }, location: { top: '200px', left: '320px' } }, appContext)
}

// ---------- Test 5: Nested layer (open layer from inside a layer) ----------
const NestedParentContent = defineComponent({
  setup() {
    const { openLayer: openChildLayer } = useLiteLayer()
    const { onCancel, close } = useLayerEvent()
    const childCount = ref(0)

    onCancel(() => close())

    const openChild = () => {
      childCount.value++
      openChildLayer({
        title: `子弹层 #${childCount.value} (继承父容器)`,
        content: NestedChildContent,
        props: { depth: 1, index: childCount.value },
        size: { width: '380px', height: '260px' },
        shade: true,
      })
    }

    return () =>
      h('div', { style: 'padding: 20px; font-size: 14px; line-height: 1.8' }, [
        h('p', { style: 'font-weight: 600; color: #303133; margin-bottom: 12px' }, '这是父弹层（Parent Layer）'),
        h('p', { style: 'color: #606266; margin-bottom: 8px' },
          '在弹层内部调用 useLiteLayer().openLayer() 打开子弹层。'),
        h('p', { style: 'color: #606266; margin-bottom: 16px' },
          '子弹层默认继承父弹层的 teleport 目标（body），无需手动指定。'),
        h('div', { style: 'display: flex; gap: 10px' }, [
          h('button', {
            style: 'padding: 8px 16px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px',
            onClick: openChild
          }, `打开子弹层 (已打开 ${childCount.value} 个)`),
        ]),
      ])
  },
})

const NestedChildContent = defineComponent({
  props: {
    depth: { type: Number, default: 1 },
    index: { type: Number, default: 1 },
  },
  setup(props) {
    const { openLayer: openGrandChild } = useLiteLayer()
    const { onCancel, close } = useLayerEvent()
    const grandChildCount = ref(0)

    onCancel(() => close())

    const openNext = () => {
      grandChildCount.value++
      openGrandChild({
        title: `第 ${props.depth + 1} 层弹层 #${grandChildCount.value}`,
        content: NestedChildContent,
        props: { depth: props.depth + 1, index: grandChildCount.value },
        size: { width: '340px', height: '220px' },
        shade: true,
      })
    }

    return () =>
      h('div', { style: 'padding: 16px; font-size: 14px; line-height: 1.8' }, [
        h('div', { style: 'background: #f0f9eb; border-radius: 6px; padding: 12px; margin-bottom: 12px' }, [
          h('span', { style: 'color: #67c23a; font-weight: 600' }, `✓ 第 ${props.depth} 层，编号 #${props.index}`),
          h('br'),
          h('span', { style: 'color: #909399; font-size: 13px' },
            `这是从弹层内部通过 useLiteLayer() 打开的嵌套弹层`),
        ]),
        h('button', {
          style: 'padding: 8px 16px; background: #e6a23c; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px',
          onClick: openNext
        }, `继续打开下一层 (已打开 ${grandChildCount.value} 个)`),
      ])
  },
})

const testNested = () => {
  addLog('Opening parent layer for nested test...')
  openLayer(
    {
      title: '父弹层 — 嵌套弹层测试',
      content: NestedParentContent,
      size: { width: '500px', height: '300px' },
      footer: false,
    },
    appContext
  )
}

// ---------- Test 6: Nested layer in specific container ----------
const ContainerNestedContent = defineComponent({
  setup() {
    const { openLayer: openInContainer } = useLiteLayer()
    const { onCancel, close } = useLayerEvent()

    onCancel(() => close())

    const openInherited = () => {
      openInContainer({
        title: '子弹层（继承容器 #test-container）',
        content: TextContent,
        props: { text: '这个子弹层自动继承了父弹层的 teleport 目标 #test-container，在绿色框内打开。' },
        size: { width: '340px', height: '200px' },
        shade: false,
        footer: false,
      })
    }

    const openInBody = () => {
      openInContainer({
        title: '子弹层（显式指定 teleport: body）',
        content: TextContent,
        props: { text: '这个子弹层显式指定了 teleport: "body"，在全屏范围打开，而非绿色框内。' },
        size: { width: '400px', height: '200px' },
        teleport: 'body',
        shade: true,
        footer: false,
      })
    }

    return () =>
      h('div', { style: 'padding: 16px; font-size: 14px; line-height: 1.8' }, [
        h('p', { style: 'color: #606266; margin-bottom: 12px' },
          '这是在 #test-container 内打开的父弹层。点击下方按钮测试子弹层的容器继承：'),
        h('div', { style: 'display: flex; flex-direction: column; gap: 10px' }, [
          h('button', {
            style: 'padding: 8px 16px; background: #67c23a; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px',
            onClick: openInherited
          }, '打开子弹层（继承 #test-container）'),
          h('button', {
            style: 'padding: 8px 16px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px',
            onClick: openInBody
          }, '打开子弹层（显式指定 body）'),
        ]),
      ])
  },
})

const testContainerNested = () => {
  addLog('Opening layer in #test-container for nested test...')
  openLayer(
    {
      title: '容器内父弹层 — teleport 继承测试',
      content: ContainerNestedContent,
      size: { width: '420px', height: '280px' },
      teleport: '#test-container',
      shade: false,
      footer: false,
    },
    appContext
  )
}
</script>

<template>
  <div style="max-width: 900px; margin: 40px auto; font-family: system-ui, sans-serif">
    <h1 style="margin-bottom: 8px">Vue Lite Layer — 功能测试</h1>
    <p style="color: #666; margin-bottom: 24px">
      纯 Vite 测试页面，覆盖动画、嵌套弹层、容器继承等核心功能。
    </p>

    <!-- 基础测试区 -->
    <div style="margin-bottom: 20px">
      <h3 style="font-size: 14px; color: #909399; margin-bottom: 10px">基础功能</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px">
        <button class="test-btn blue" @click="testOpenClose">1. 打开 / 关闭动画</button>
        <button class="test-btn green" @click="testLoading">2. Loading 动画</button>
        <button class="test-btn orange" @click="testMaximize">3. 最大化 / 还原</button>
        <button class="test-btn gray" @click="testMultiple">4. 多弹层</button>
      </div>
    </div>

    <!-- 嵌套弹层测试区 -->
    <div style="margin-bottom: 20px">
      <h3 style="font-size: 14px; color: #909399; margin-bottom: 10px">嵌套弹层</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px">
        <button class="test-btn purple" @click="testNested">5. 嵌套弹层（多层级）</button>
        <button class="test-btn teal" @click="testContainerNested">6. 容器内嵌套（teleport 继承）</button>
        <button class="test-btn red-outline" @click="closeAllLayer">关闭所有</button>
      </div>
    </div>

    <!-- 容器目标区域 -->
    <div
      id="test-container"
      style="position: relative; border: 2px dashed #67c23a; border-radius: 8px; height: 350px; margin-bottom: 20px; background: #f0f9eb22; overflow: hidden"
    >
      <div style="position: absolute; top: 8px; left: 12px; font-size: 12px; color: #67c23a; font-weight: 600">
        #test-container（teleport 目标区域）
      </div>
    </div>

    <!-- 日志区 -->
    <div style="background: #f5f7fa; border-radius: 8px; padding: 16px; min-height: 120px">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #909399">日志</h3>
      <div v-for="(item, i) in log" :key="i" style="font-size: 13px; font-family: monospace; color: #303133; line-height: 1.8">
        {{ item }}
      </div>
      <div v-if="!log.length" style="color: #c0c4cc; font-size: 13px">点击上方按钮开始测试...</div>
    </div>
  </div>
</template>

<style>
.test-btn {
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  color: #fff;
  border-radius: 6px;
  transition: opacity 0.15s;
}
.test-btn:hover { opacity: 0.85; }
.test-btn:active { opacity: 0.7; }
.test-btn.blue { background: #409eff; }
.test-btn.green { background: #67c23a; }
.test-btn.orange { background: #e6a23c; }
.test-btn.gray { background: #909399; }
.test-btn.purple { background: #7c3aed; }
.test-btn.teal { background: #0d9488; }
.test-btn.red-outline {
  background: #fff;
  color: #f56c6c;
  border: 1px solid #f56c6c;
}
</style>
