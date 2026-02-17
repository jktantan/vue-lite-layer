<template>
  <div class="ep-test">
    <h3>Element Plus 按需导入 + Layer 测试</h3>
    <p>宿主已通过 ElConfigProvider 设置中文。点击按钮检查 Layer 内组件文案是否继承。</p>
    <button @click="openElementLayer">打开 Element Plus Layer</button>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, ref } from 'vue'
import { useLiteLayer } from 'vue-lite-layer'
import { ElButton, ElDatePicker, ElInput, ElPagination, ElSelect, ElOption } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/pagination/style/css'
import 'element-plus/es/components/select/style/css'
import 'element-plus/es/components/option/style/css'

const { openLayer } = useLiteLayer()
const props = defineProps<{ lang: 'zh' | 'en' }>()

const openElementLayer = () => {
  const isZh = props.lang === 'zh'
  const LayerContent = defineComponent({
    name: 'LayerElementPlusContent',
    setup() {
      const text = ref(isZh ? 'Layer 内输入框' : 'Layer input')
      const value = ref('A')
      const date = ref('')

      return () =>
        h('div', { style: 'padding: 16px; display: grid; gap: 12px;' }, [
          h(
            'p',
            { style: 'margin: 0; color: #666;' },
            isZh
              ? '当前组件未在 Layer 内再包 ConfigProvider'
              : 'This layer component does not wrap ConfigProvider again'
          ),
          h(ElInput, {
            modelValue: text.value,
            'onUpdate:modelValue': (v: string) => (text.value = v),
            placeholder: isZh ? '请输入内容' : 'Please input'
          }),
          h(
            ElSelect,
            {
              modelValue: value.value,
              'onUpdate:modelValue': (v: string) => (value.value = v),
              placeholder: isZh ? '请选择' : 'Please select',
              style: 'width: 220px;'
            },
            () => [
              h(ElOption, { label: isZh ? '选项 A' : 'Option A', value: 'A' }),
              h(ElOption, { label: isZh ? '选项 B' : 'Option B', value: 'B' })
            ]
          ),
          h(ElDatePicker, {
            modelValue: date.value,
            'onUpdate:modelValue': (v: string) => (date.value = v),
            type: 'date',
            placeholder: isZh ? '请选择日期' : 'Pick a date',
            style: 'width: 220px;'
          }),
          h(ElPagination, {
            total: 120,
            pageSize: 10,
            currentPage: 1,
            layout: 'total, prev, pager, next, jumper'
          }),
          h(
            ElButton,
            { type: 'primary' },
            { default: () => (isZh ? '确认按钮（Element Plus）' : 'Confirm (Element Plus)') }
          )
        ])
    }
  })

  openLayer({
    title: isZh ? 'Element Plus Layer 测试' : 'Element Plus Layer Test',
    content: LayerContent,
    size: { width: '640px', height: '420px' }
  })
}
</script>

<style scoped>
.ep-test {
  padding: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fafafa;
  margin-top: 16px;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #409eff;
  color: #fff;
}
</style>
