<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh } = useRegisterSW()

/**
 * Activate the waiting service worker, then reload.
 * The plugin's updateServiceWorker() reloads only a page that the old worker controls,
 * and does nothing if no worker waits (another window updated first). This works in all cases.
 */
async function update() {
  const sw = (await navigator.serviceWorker.getRegistration())?.waiting
  if (!sw) return location.reload()
  sw.addEventListener('statechange', () => sw.state === 'activated' && location.reload())
  sw.postMessage({ type: 'SKIP_WAITING' })
}
</script>

<template>
  <div v-if="needRefresh" class="toast" role="status">
    <span>Доступна новая версия</span>
    <button class="primary" @click="update">Обновить</button>
    <button @click="needRefresh = false">Позже</button>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 72px;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.25);
}
span {
  flex: 1;
}
button {
  min-height: 48px;
  padding: 0 12px;
  font: inherit;
  color: var(--accent);
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
button.primary {
  color: var(--on-accent);
  background: var(--accent);
}
</style>
