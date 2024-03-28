import './assets/main.css'
import VXETable from 'vxe-table'
import { createApp } from 'vue'
import Application from './App.vue'
import VueLiteLayer from '../lib'
import 'vxe-table/lib/style.css'
createApp(Application).use(VXETable).use(VueLiteLayer).mount('#app')
