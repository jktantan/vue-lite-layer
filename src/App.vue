<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import TheWelcome from './components/TheWelcome.vue'
import table from './components/table.vue'
import useLiteLayer from '@lib/utils/useLiteLayer'
import { type ComponentInternalInstance, getCurrentInstance, onMounted } from 'vue'
const { appContext } = getCurrentInstance() as ComponentInternalInstance
const { openLayer } = useLiteLayer()
import { ref } from 'vue'

interface RowVO {
  id: number
  name: string
  role: string
  sex: string
  age: number
  address: string
}

const tableData = ref<RowVO[]>([
  { id: 10001, name: 'Test1', role: 'Develop', sex: 'Man', age: 28, address: 'test abc' },
  { id: 10002, name: 'Test2', role: 'Test', sex: 'Women', age: 22, address: 'Guangzhou' },
  { id: 10003, name: 'Test3', role: 'PM', sex: 'Man', age: 32, address: 'Shanghai' },
  { id: 10004, name: 'Test4', role: 'Designer', sex: 'Women', age: 24, address: 'Shanghai' }
])
onMounted(()=>{
  const ppp = document.getElementsByClassName('cache-page-wrapper')[0]
  openLayer({
    shade: false,
    teleport: ppp,
    size: {
      width: '60%',
      height: '80%'
    },
    title: '新增任务',
    content: table,
    onOk: () => {

    }},appContext)
})

// openLayer({
//   shade: false,
//   size: {
//     width: '60%',
//     height: '80%'
//   },
//   title: '新增任务',
//   content: table,
//   onOk: () => {
//
//   }},appContext)
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="./assets/logo.svg" width="125" height="125" />

    <div class="wrapper ">
      <HelloWorld msg="You did it!" />
    </div>
  </header>

  <main >
<!--    <TheWelcome />-->
    <vxe-table
      :data="tableData">
      <vxe-column type="seq" width="60"></vxe-column>
      <vxe-column field="name" title="Name"></vxe-column>
      <vxe-column field="sex" title="Sex"></vxe-column>
      <vxe-column field="age" title="Age"></vxe-column>
    </vxe-table>
  </main>
  <div style="height:800px;width:800px" class="cache-page-wrapper"/>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
