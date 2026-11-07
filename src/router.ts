import { createRouter, createWebHashHistory } from 'vue-router'
import LookupView from './views/LookupView.vue'
import ReviewView from './views/ReviewView.vue'
import DecksView from './views/DecksView.vue'
import SettingsView from './views/SettingsView.vue'
import ReadView from './views/ReadView.vue'

// Hash history: the static server always serves index.html, also offline.
// `nav` is the tab label; a tab with `icon` shows only the icon (the label is for screen readers).
export const routes = [
  { path: '/', component: LookupView, meta: { nav: 'Поиск' } },
  { path: '/review', component: DecksView, meta: { nav: 'Учить' } },
  { path: '/read', component: ReadView, meta: { nav: 'Читать' } },
  { path: '/settings', component: SettingsView, meta: { nav: 'Настройки', icon: 'cog' } },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    ...routes,
    // Review of one deck is under the "Учить" tab, but not in the nav.
    { path: '/review/:deck', component: ReviewView, props: true },
    // Old links (installed apps, bookmarks) before the Settings screen.
    { path: '/backup', redirect: '/settings' },
    { path: '/sources', redirect: '/settings' },
    { path: '/stats', redirect: '/' }, // stats are on the search screen now
  ],
})
