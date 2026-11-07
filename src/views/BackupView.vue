<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { exportDeck, getStats, importDeck, parseBackup } from '../db'

const counts = ref<{ cards: number; reviews: number } | null>(null)
const message = ref('')
const error = ref('')

async function loadCounts() {
  const s = await getStats()
  counts.value = { cards: s.totalCards, reviews: s.totalReviews }
}
onMounted(loadCounts)

async function download() {
  const url = URL.createObjectURL(await exportDeck())
  const a = document.createElement('a')
  a.href = url
  a.download = `deutsch-deck-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(a)
  a.click()
  a.remove()
  // The download reads the blob after click() returns, so the URL must stay valid a little longer.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  message.value = 'Файл сохранён.'
  error.value = ''
}

async function upload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // so the same file can be selected again
  if (!file) return
  message.value = ''
  error.value = ''
  try {
    const backup = parseBackup(await file.text())
    const ok = confirm(
      `Импортировать ${backup.cards.length} карточек и ${backup.reviews.length} повторений?\n` +
        'Карточка, которая есть и тут, и в файле, сохранит версию с бóльшим числом повторений.',
    )
    if (!ok) return
    const res = await importDeck(backup)
    message.value = `Готово: обновлено карточек — ${res.cards}, повторений в файле — ${res.reviews}.`
    await loadCounts()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}
</script>

<template>
  <h1>Резервная копия</h1>
  <p v-if="counts" class="muted">В колоде: {{ counts.cards }} карточек, {{ counts.reviews }} повторений.</p>

  <section>
    <h2>Экспорт</h2>
    <p class="muted">Сохраните колоду и историю повторений в файл JSON. Словарь в файл не входит.</p>
    <button class="primary" @click="download">Скачать файл</button>
  </section>

  <section>
    <h2>Импорт</h2>
    <p class="muted">Загрузите файл, сохранённый на этом или другом устройстве. Новый прогресс не будет потерян.</p>
    <label class="file">
      Выбрать файл…
      <input type="file" accept=".json,application/json" @change="upload" />
    </label>
  </section>

  <p v-if="message" class="ok" role="status">{{ message }}</p>
  <p v-if="error" class="bad" role="alert">{{ error }}</p>
</template>

<style scoped>
h2 {
  font-size: 18px;
  margin: 24px 0 4px;
}
.muted {
  color: var(--muted);
  font-size: 14px;
}
button,
.file {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font: inherit;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
}
.primary {
  color: var(--on-accent);
  background: var(--accent);
  border: none;
}
.file {
  position: relative;
  color: var(--accent);
  border: 1px solid var(--accent);
}
/* The native file input is hidden; the label opens it and stays reachable with the keyboard. */
.file input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}
.file:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.ok {
  color: var(--das);
}
.bad {
  color: var(--die);
}
</style>
