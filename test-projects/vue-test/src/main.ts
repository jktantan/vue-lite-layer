import { createApp, ref, reactive, readonly } from 'vue'
import App from './App.vue'
import VueLiteLayer from 'vue-lite-layer'
import '../../../dist/vue-lite-layer.css'

const app = createApp(App)

// 在应用级别 provide 测试数据（这样才会在 appContext.provides 中）
app.provide('testData', ref(100))
app.provide('testCount', ref(100))
app.provide('testUser', reactive({ name: 'Alice' }))
app.provide('testReadonlyUser', readonly(reactive({ name: 'Bob' })))

app.use(VueLiteLayer)

app.mount('#app')
