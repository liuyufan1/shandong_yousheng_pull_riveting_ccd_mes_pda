import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'  // 引入 Element Plus
import 'element-plus/dist/index.css'   // 引入样式
import * as ElementPlusIconsVue from '@element-plus/icons-vue' // 引入图标库

// 创建 Vue 应用
const app = createApp(App)

// 全局注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

// 使用 Element Plus
app.use(ElementPlus)

// 挂载应用
app.mount('#app')