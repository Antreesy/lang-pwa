<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getDataInfo } from '../db'
import { getTheme, setTheme, type Theme } from '../theme'
import BackupSection from '../components/BackupSection.vue'

const theme = ref<Theme>(getTheme())
const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]
function choose(t: Theme) {
  theme.value = t
  setTheme(t)
}

const info = ref<Awaited<ReturnType<typeof getDataInfo>> | null>(null)
onMounted(async () => (info.value = await getDataInfo()))
</script>

<template>
  <h1>Настройки</h1>

  <section>
    <h2>Тема</h2>
    <div class="themes" role="radiogroup" aria-label="Тема">
      <button
        v-for="t in THEMES"
        :key="t.value"
        role="radio"
        :aria-checked="theme === t.value"
        :class="{ on: theme === t.value }"
        @click="choose(t.value)"
      >
        {{ t.label }}
      </button>
    </div>
  </section>

  <BackupSection />

  <section>
    <h2>Источники и лицензии</h2>
    <dl>
      <dt><a href="https://tatoeba.org" target="_blank" rel="noopener">Tatoeba</a></dt>
      <dd>
        Примеры предложений и их переводы.
        Лицензия <a href="https://creativecommons.org/licenses/by/2.0/fr/" target="_blank" rel="noopener">CC BY 2.0 FR</a>.
      </dd>

      <dt><a href="https://de.wiktionary.org" target="_blank" rel="noopener">Викисловарь (Wiktionary, de)</a></dt>
      <dd>
        Слова, артикли, формы, переводы и темы. Данные получены через
        <a href="https://kaikki.org/dewiktionary/" target="_blank" rel="noopener">Kaikki.org</a> (wiktextract).
        Лицензия <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>.
        Словарь в этом приложении — производная работа и распространяется на тех же условиях.
      </dd>

      <dt>Программы</dt>
      <dd>Vue, Vue Router, ts-fsrs, vite-plugin-pwa, Workbox (MIT); Dexie.js (Apache-2.0).</dd>
    </dl>
  </section>

  <section v-if="info">
    <h2>Данные</h2>
    <p class="muted">
      Слов: {{ info.words }} · предложений: {{ info.sentences }}<br />
      Версия словаря: {{ info.version ?? '—' }}
    </p>
  </section>
</template>

<style scoped>
h2 {
  font-size: 18px;
  margin: 24px 0 8px;
}
.themes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.themes button {
  min-height: 48px;
  font: inherit;
  font-size: 15px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
}
.themes button.on {
  color: var(--on-accent);
  background: var(--accent);
  border-color: var(--accent);
}
dt {
  font-weight: 600;
  margin-top: 12px;
}
dd {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 15px;
}
a {
  color: var(--accent);
}
.muted {
  color: var(--muted);
  font-size: 14px;
}
</style>
