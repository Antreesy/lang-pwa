import { createRouter, createWebHashHistory } from 'vue-router'
import LookupView from './views/LookupView.vue'
import ReviewView from './views/ReviewView.vue'
import StatsView from './views/StatsView.vue'
import BackupView from './views/BackupView.vue'
import SourcesView from './views/SourcesView.vue'

// Hash history: the static server always serves index.html, also offline.
export const routes = [
  { path: '/', component: LookupView, meta: { title: 'Поиск' } },
  { path: '/review', component: ReviewView, meta: { title: 'Повторение' } },
  { path: '/stats', component: StatsView, meta: { title: 'Статистика' } },
  { path: '/backup', component: BackupView, meta: { title: 'Резервная копия' } },
  { path: '/sources', component: SourcesView, meta: { title: 'Источники' } },
]

export const router = createRouter({ history: createWebHashHistory(), routes })
