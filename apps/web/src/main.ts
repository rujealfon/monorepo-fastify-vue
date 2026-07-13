import ui from '@nuxt/ui/vue-plugin'
import { createApp } from 'vue'

import { registerPlugins } from '@/app/plugins'
import router from '@/app/router'

import App from './App.vue'
import './assets/styles/main.css'

const app = createApp(App)

registerPlugins(app)
app.use(router)
app.use(ui)

app.mount('#app')
