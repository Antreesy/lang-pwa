import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { getTheme, setTheme } from './theme'

setTheme(getTheme())

// Ask the browser not to delete IndexedDB (the deck) when disk space is low.
navigator.storage?.persist?.()

createApp(App).use(router).mount('#app')
