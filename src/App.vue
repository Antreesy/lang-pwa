<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { routes } from './router'
import { importData } from './db'
import UpdateToast from './components/UpdateToast.vue'

const ready = ref(false)
const progress = ref<number | null>(null) // null: no import is running
const error = ref('')

async function load() {
  error.value = ''
  try {
    await importData(p => (progress.value = p))
    ready.value = true
  } catch (e) {
    error.value = String(e)
  }
}
onMounted(load)

// A tab is active on its path and on paths under it: "Учить" on /review/topic:food:1.
const route = useRoute()
const isActive = (path: string) => route.path === path || (path !== '/' && route.path.startsWith(path + '/'))
</script>

<template>
  <main>
    <!-- The key makes a new view for each path, so /review/a → /review/b loads deck b. -->
    <RouterView v-if="ready" :key="route.fullPath" />
    <div v-else-if="error" class="status" role="alert">
      <p>Не удалось загрузить словарь.</p>
      <p class="muted">{{ error }}</p>
      <button @click="load">Повторить</button>
    </div>
    <div v-else-if="progress !== null" class="status" role="status">
      <p>Загрузка словаря… {{ Math.round(progress * 100) }} %</p>
      <progress :value="progress" />
    </div>
  </main>
  <nav>
    <RouterLink v-for="r in routes" :key="r.path" :to="r.path" :class="{ active: isActive(r.path) }">{{ r.meta.nav }}</RouterLink>
  </nav>
  <UpdateToast />
</template>

<style scoped>
main {
  flex: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}
.status {
  margin-top: 30vh;
  text-align: center;
}
.status progress {
  width: 100%;
  height: 8px;
}
.status button {
  min-height: 48px;
  padding: 0 24px;
  font: inherit;
}
.muted {
  color: var(--muted);
  font-size: 14px;
}
nav {
  position: sticky;
  bottom: 0;
  display: flex;
  overflow-x: auto;
  background: var(--surface);
  border-top: 1px solid var(--border);
}
nav a {
  flex: 1;
  min-height: 56px;
  min-width: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  font-size: 13px;
  color: var(--muted);
  text-decoration: none;
  text-align: center;
}
nav a.active {
  color: var(--accent);
  font-weight: 600;
}
</style>
