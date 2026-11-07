<script setup lang="ts">
import { ref, watch } from 'vue'
import { searchWords, type Word } from '../db'
import { POS } from '../labels'
import { dudenSearchUrl, lookupOnline, type OnlineEntry } from '../online'
import WordCard from '../components/WordCard.vue'
import DeckButton from '../components/DeckButton.vue'
import StatsPanel from '../components/StatsPanel.vue'

const query = ref('')
const exact = ref<Word[]>([])
const more = ref<Word[]>([])

const online = ref<OnlineEntry | null>(null)
const onlineState = ref<'idle' | 'loading' | 'notfound' | 'error'>('idle')

async function searchOnline() {
  const q = query.value
  onlineState.value = 'loading'
  online.value = null
  try {
    const entry = await lookupOnline(q)
    if (q !== query.value) return
    online.value = entry
    onlineState.value = entry ? 'idle' : 'notfound'
  } catch {
    if (q === query.value) onlineState.value = 'error'
  }
}

watch(query, async q => {
  online.value = null
  onlineState.value = 'idle'
  const res = await searchWords(q)
  // Ignore old results: the user typed more while the query ran.
  if (q !== query.value) return
  exact.value = res.exact
  more.value = res.more
})
</script>

<template>
  <h1>Поиск</h1>
  <input
    v-model="query"
    type="search"
    placeholder="Слово на немецком"
    aria-label="Слово на немецком"
    lang="de"
    autofocus
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
  />

  <!-- With an empty search field, the screen shows the stats. -->
  <StatsPanel v-if="!query.trim()" />

  <WordCard v-for="w in exact" :key="w.id" :word="w" :query="query">
    <DeckButton :word-id="w.id" />
  </WordCard>

  <template v-if="more.length">
    <h2 class="sub">{{ exact.length ? 'Похожие слова' : 'Начинается с «' + query.trim() + '»' }}</h2>
    <ul class="more">
      <li v-for="w in more" :key="w.id">
        <button @click="query = w.lemma">
          <span lang="de">{{ w.lemma }}</span>
          <span class="muted">{{ POS[w.pos] ?? w.pos }} {{ w.ru[0] ?? w.en[0] }}</span>
        </button>
      </li>
    </ul>
  </template>

  <p v-if="query.trim() && !exact.length && !more.length" class="muted">Ничего не найдено.</p>

  <section v-if="query.trim() && !exact.length" class="online">
    <a :href="dudenSearchUrl(query)" target="_blank" rel="noopener" class="duden">Искать в Duden</a>
    <button v-if="!online" :disabled="onlineState === 'loading'" @click="searchOnline">
      {{ onlineState === 'loading' ? 'Поиск…' : 'Искать онлайн в Викисловаре' }}
    </button>
    <p v-if="onlineState === 'notfound'" class="muted">В Викисловаре тоже ничего нет.</p>
    <p v-if="onlineState === 'error'" class="muted">Не удалось загрузить. Проверьте интернет.</p>
    <article v-if="online">
      <h2 lang="de">{{ online.title }}</h2>
      <pre>{{ online.extract.slice(0, 2000) }}</pre>
      <a :href="online.url" target="_blank" rel="noopener">Открыть в Викисловаре</a>
    </article>
  </section>
</template>

<style scoped>
input {
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  margin-bottom: 16px;
  font: inherit;
  font-size: 20px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.sub {
  font-size: 16px;
  color: var(--muted);
  margin: 16px 0 8px;
}
.more {
  margin: 0;
  padding: 0;
  list-style: none;
}
.more button {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 16px;
  font: inherit;
  font-size: 18px;
  text-align: left;
  color: var(--text);
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.online {
  margin-top: 16px;
}
.online > button {
  margin-left: 12px;
  min-height: 48px;
  padding: 0 16px;
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
}
.online pre {
  white-space: pre-wrap;
  font: inherit;
  font-size: 15px;
}
.muted {
  color: var(--muted);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
