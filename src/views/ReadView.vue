<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { randomSentences, searchWords, type Sentence, type Word } from '../db'
import WordCard from '../components/WordCard.vue'
import DeckButton from '../components/DeckButton.vue'

const PAGE = 15

const items = ref<{ key: number; s: Sentence; parts: string[]; shown: boolean }[]>([])
let nextKey = 0
let loading = false

async function more() {
  if (loading) return
  loading = true
  try {
    const rows = await randomSentences(PAGE)
    // Odd indexes of `parts` are words, even indexes are spaces and punctuation.
    items.value.push(...rows.map(s => ({ key: nextKey++, s, parts: s.de.split(/(\p{L}+)/u), shown: false })))
  } finally {
    loading = false
  }
}

// Endless scroll: load more when the end marker comes near the screen.
const end = useTemplateRef<HTMLElement>('end')
let observer: IntersectionObserver | null = null
onMounted(async () => {
  await more()
  observer = new IntersectionObserver(async e => {
    if (e[0]?.isIntersecting) await more()
  }, { rootMargin: '400px' })
  if (end.value) observer.observe(end.value)
})
onBeforeUnmount(() => observer?.disconnect())

// Bottom sheet with the cards of the tapped word.
const sheet = useTemplateRef<HTMLDialogElement>('sheet')
const tapped = ref('')
const words = ref<Word[] | null>(null)

async function open(token: string) {
  tapped.value = token
  words.value = null
  sheet.value?.showModal()
  const res = (await searchWords(token)).exact
  if (tapped.value === token) words.value = res
}

/** A click on the backdrop (outside the sheet content) closes the sheet. */
function backdrop(e: MouseEvent) {
  if (e.target === sheet.value) sheet.value?.close()
}
</script>

<template>
  <h1>Читать</h1>
  <p class="hint">Нажмите на слово, чтобы открыть его карточку.</p>

  <ol class="sentences">
    <li v-for="it in items" :key="it.key">
      <p class="de" lang="de">
        <template v-for="(p, i) in it.parts" :key="i">
          <button v-if="i % 2" class="w" @click="open(p)">{{ p }}</button>
          <template v-else>{{ p }}</template>
        </template>
      </p>
      <p v-if="it.shown" class="tr">{{ it.s.ru ?? it.s.en }}</p>
      <button v-else-if="it.s.ru || it.s.en" class="show" @click="it.shown = true">перевод</button>
    </li>
  </ol>
  <div ref="end" class="end" aria-hidden="true"></div>

  <dialog ref="sheet" class="sheet" aria-label="Карточка слова" @click="backdrop">
    <div class="content">
      <button class="close" aria-label="Закрыть" @click="sheet?.close()">✕</button>
      <p v-if="words === null" class="muted">…</p>
      <p v-else-if="!words.length" class="muted">
        «<span lang="de">{{ tapped }}</span>» нет в словаре.
      </p>
      <WordCard v-for="w in words ?? []" :key="w.id" :word="w" :query="tapped">
        <DeckButton :word-id="w.id" />
      </WordCard>
    </div>
  </dialog>
</template>

<style scoped>
.hint,
.muted {
  color: var(--muted);
}
.sentences {
  margin: 0;
  padding: 0;
  list-style: none;
}
.sentences li {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.de {
  margin: 0;
  font-size: 20px;
  line-height: 1.8;
}
.w {
  padding: 2px 0;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.w:hover,
.w:focus-visible {
  background: var(--surface);
}
.tr {
  margin: 4px 0 0;
  color: var(--muted);
}
.show {
  min-height: 36px;
  padding: 0 12px;
  margin-top: 4px;
  font: inherit;
  font-size: 14px;
  color: var(--muted);
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}
.end {
  height: 1px;
}
.sheet {
  width: 100%;
  max-width: 640px;
  max-height: 80vh;
  margin: auto auto 0;
  padding: 0;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
}
.sheet::backdrop {
  background: rgb(0 0 0 / 0.5);
}
.content {
  padding: 8px 16px 16px;
}
.close {
  display: block;
  width: 48px;
  height: 48px;
  margin-left: auto;
  font-size: 20px;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
}
</style>
