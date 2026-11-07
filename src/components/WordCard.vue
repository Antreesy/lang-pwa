<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { getSentences, type Sentence, type Word } from '../db'
import { POS } from '../labels'
import { verbParts } from '../grammar'
import ArticleBadge from './ArticleBadge.vue'
import { dudenSearchUrl } from '../online'

const props = defineProps<{ word: Word; query?: string }>()

const sentences = ref<Sentence[]>([])
watchEffect(async () => {
  const ids = props.word.examples
  const rows = await getSentences(ids)
  if (ids === props.word.examples) sentences.value = rows
})

/** Split a sentence into parts. Parts that are forms of the word get `hit: true`. */
function highlight(text: string) {
  return text.split(/([A-Za-zÄÖÜäöüß]+)/).map(t => ({ t, hit: props.word.forms.includes(t.toLowerCase()) }))
}
</script>

<template>
  <article class="card">
    <header>
      <h2 lang="de">
        <template v-if="word.pluralOnly"><ArticleBadge gender="pl" />&#32;</template>
        <template v-for="g in word.genders ?? []" :key="g"><ArticleBadge :gender="g" />&#32;</template>
        {{ word.lemma }}
      </h2>
      <span class="pos">{{ POS[word.pos] ?? word.pos }}</span>
    </header>

    <p v-if="query && query.trim().toLowerCase() !== word.lemma.toLowerCase()" class="muted">
      «<span lang="de">{{ query.trim() }}</span>» — форма слова
    </p>

    <template v-if="word.pos === 'noun'">
      <p v-if="word.adjForms?.length" lang="de">{{ word.adjForms.join(' · ') }}</p>
      <p v-else-if="word.pluralOnly" class="muted">только множественное число</p>
      <p v-else-if="word.plural" lang="de"><ArticleBadge gender="pl" /> {{ word.plural }}</p>
      <p v-else class="muted">нет мн. числа</p>
    </template>
    <p v-if="word.verb" lang="de">{{ verbParts(word).join(' · ') }}</p>

    <ol v-if="word.ru.length" class="meanings">
      <li v-for="m in word.ru" :key="m" lang="ru">{{ m }}</li>
    </ol>
    <p v-if="word.en.length" class="muted" lang="en">EN: {{ word.en.join('; ') }}</p>

    <slot />

    <a class="duden" :href="dudenSearchUrl(word.lemma)" target="_blank" rel="noopener">Открыть в Duden</a>

    <ul v-if="sentences.length" class="examples">
      <li v-for="s in sentences" :key="s.id">
        <span lang="de"><template v-for="(p, i) in highlight(s.de)" :key="i"><b v-if="p.hit">{{ p.t }}</b><template v-else>{{ p.t }}</template></template></span>
        <span class="muted" :lang="s.ru ? 'ru' : 'en'">{{ s.ru ?? s.en }}</span>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.duden {
  display: inline-block;
  margin: 8px 0;
  font-size: 14px;
}
.card {
  padding: 16px;
  margin-bottom: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}
header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
h2 {
  margin: 0;
  font-size: 26px;
}
.pos,
.muted {
  color: var(--muted);
  font-size: 14px;
}
p {
  margin: 8px 0;
}
.meanings {
  margin: 8px 0;
  padding-left: 24px;
  font-size: 18px;
}
.examples {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.examples li {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  border-top: 1px solid var(--border);
}
</style>
