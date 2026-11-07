<script setup lang="ts">
import { routes } from './router'
import UpdateToast from './components/UpdateToast.vue'
</script>

<template>
  <main>
    <RouterView />
  </main>
  <nav>
    <RouterLink v-for="r in routes" :key="r.path" :to="r.path">{{ r.meta.title }}</RouterLink>
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
  min-width: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
  text-align: center;
}
nav a.router-link-exact-active {
  color: var(--accent);
  font-weight: 600;
}
</style>
