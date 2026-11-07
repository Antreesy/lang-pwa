import { createRouter, createWebHashHistory } from 'vue-router'
import LookupView from './views/LookupView.vue'
import ReviewView from './views/ReviewView.vue'
import DecksView from './views/DecksView.vue'
import StatsView from './views/StatsView.vue'
import BackupView from './views/BackupView.vue'
import SourcesView from './views/SourcesView.vue'

// Hash history: the static server always serves index.html, also offline.
// `nav` is short, so 5 tabs fit on a 360 px screen.
export const routes = [
  { path: '/', component: LookupView, meta: { nav: 'Поиск' } },
  { path: '/review', component: DecksView, meta: { nav: 'Учить' } },
  { path: '/stats', component: StatsView, meta: { nav: 'Статистика' } },
  { path: '/backup', component: BackupView, meta: { nav: 'Копия' } },
  { path: '/sources', component: SourcesView, meta: { nav: 'Инфо' } },
]

export const router = createRouter({
  history: createWebHashHistory(),
  // Review of one deck is under the "Учить" tab, but not in the nav.
  routes: [...routes, { path: '/review/:deck', component: ReviewView, props: true }],
})
