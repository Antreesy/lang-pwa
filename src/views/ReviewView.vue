<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ALL, answerCard, getDeck, getWord, NEW_WORDS_PER_DAY, nextCard, skipWord, type DeckCard, type Gender, type Session, type Skip, type Word } from '../db'
import { formatInterval, GRADES, preview, type Grade } from '../srs'
import { POS } from '../labels'
import WordCard from '../components/WordCard.vue'

const props = defineProps<{ deck: string }>()

const ARTICLES: { g: Gender; label: string }[] = [{ g: 'm', label: 'der' }, { g: 'f', label: 'die' }, { g: 'n', label: 'das' }]
const GRADE_LABEL: Record<Grade, string> = { 1: 'Снова', 2: 'Трудно', 3: 'Хорошо', 4: 'Легко' }

const card = ref<DeckCard | null>(null)
const word = ref<Word | null>(null)
const flipped = ref(false)
const picked = ref<Gender | null>(null)
const intervals = ref(new Map<Grade, string>())
const left = ref(0)
const nextDue = ref<Date | null>(null)
const limitReached = ref(false)
const newTomorrow = ref(false)
const busy = ref(true)
const title = ref('')

const isNoun = computed(() => word.value?.pos === 'noun' && !!word.value.genders?.length)
const articleOk = computed(() => picked.value !== null && !!word.value?.genders?.includes(picked.value))
const frontMeaning = computed(() => {
  const w = word.value
  return w ? (w.ru.length ? w.ru : w.en).slice(0, 2).join('; ') : ''
})

// In one session, a word answered in one direction does not show in the other direction (the answer is still in mind).
const session: Session = { doneCards: new Set(), doneWords: new Set() }

async function next() {
  busy.value = true
  const now = new Date()
  const res = await nextCard(props.deck, session, now)
  flipped.value = false
  picked.value = null
  card.value = res.card
  word.value = null
  if (res.card) {
    left.value = res.left
    const w = await getWord(res.card.wordId)
    if (!w) {
      // The word is not in the dictionary after a data update. Skip its cards in this session.
      session.doneWords.add(res.card.wordId)
      return next()
    }
    word.value = w
    const p = await preview(res.card.fsrs, now)
    intervals.value = new Map(GRADES.map(g => [g, formatInterval(now, p.get(g)!)]))
  } else {
    nextDue.value = res.nextDue
    limitReached.value = res.limitReached
    newTomorrow.value = res.newTomorrow
  }
  busy.value = false
}

function flip(article: Gender | null) {
  if (!card.value || flipped.value) return
  picked.value = article
  flipped.value = true
  // A focused button gets a click from the Space key. That must not rate the card.
  ;(document.activeElement as HTMLElement | null)?.blur()
}

/** «Знаю» / «Не нужно» on a new card: the word leaves all decks, the next word comes. */
async function skip(reason: Skip['reason']) {
  if (!card.value || busy.value) return
  busy.value = true
  await skipWord(card.value.wordId, reason)
  await next()
}

async function rate(g: Grade) {
  if (!card.value || !flipped.value || busy.value) return
  busy.value = true
  await answerCard(card.value, g)
  session.doneCards.add(card.value.id)
  session.doneWords.add(card.value.wordId)
  await next()
}

function onKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey || !card.value) return
  if (!flipped.value) {
    if (e.key === ' ') {
      e.preventDefault()
      flip(null)
    } else if (isNoun.value && ['1', '2', '3'].includes(e.key)) {
      flip(ARTICLES[Number(e.key) - 1].g)
    }
  } else if (['1', '2', '3', '4'].includes(e.key)) {
    rate(Number(e.key) as Grade)
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  const d = props.deck === ALL ? null : await getDeck(props.deck)
  title.value = d ? (d.part ? `${d.name} ${d.part}` : d.name) : 'Все мои карточки'
  next()
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <RouterLink to="/review" class="back">← Колоды</RouterLink>
  <h1>{{ title }} <span v-if="card" class="left">осталось: {{ left }}</span></h1>

  <template v-if="card && word">
    <section v-if="!flipped" class="front">
      <p class="dir">{{ card.dir === 'de-ru' ? 'DE → RU' : 'RU → DE' }} · {{ POS[word.pos] ?? word.pos }}</p>
      <p v-if="card.dir === 'de-ru'" class="prompt" lang="de">{{ word.lemma }}</p>
      <p v-else class="prompt" :lang="word.ru.length ? 'ru' : 'en'">{{ frontMeaning }}</p>

      <template v-if="isNoun">
        <p class="hint">Выберите артикль:</p>
        <div class="articles">
          <button v-for="(a, i) in ARTICLES" :key="a.g" :class="a.label" lang="de" @click="flip(a.g)">
            {{ a.label }} <kbd>{{ i + 1 }}</kbd>
          </button>
        </div>
      </template>
      <button class="show" @click="flip(null)">Показать ответ <kbd>Пробел</kbd></button>
      <div v-if="card.fsrs.reps === 0" class="skip">
        <span class="hint">Новое слово</span>
        <button :disabled="busy" @click="skip('known')">Знаю</button>
        <button :disabled="busy" @click="skip('ignored')">Не нужно</button>
      </div>
    </section>

    <section v-else>
      <p v-if="picked" :class="['verdict', articleOk ? 'ok' : 'bad']" role="status">
        {{ articleOk ? '✓ Артикль верный' : `✗ Артикль неверный: вы выбрали «${ARTICLES.find(a => a.g === picked)!.label}»` }}
      </p>
      <WordCard :word="word" />
      <div class="grades">
        <button v-for="g in GRADES" :key="g" :class="`g${g}`" :disabled="busy" @click="rate(g)">
          <span>{{ GRADE_LABEL[g] }}</span>
          <small>{{ intervals.get(g) }}</small>
          <kbd>{{ g }}</kbd>
        </button>
      </div>
    </section>
  </template>

  <div v-else-if="!busy" class="empty">
    <template v-if="nextDue || newTomorrow">
      <p>На сегодня всё! 🎉</p>
      <p v-if="limitReached" class="muted">Лимит новых слов ({{ NEW_WORDS_PER_DAY }} в день) исчерпан.</p>
      <p v-if="newTomorrow" class="muted">Новые карточки — завтра.</p>
      <p v-if="nextDue" class="muted">Следующее повторение: {{ nextDue.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) }}</p>
    </template>
    <template v-else-if="deck === ALL">
      <p>Карточек пока нет.</p>
      <p class="muted">Выберите <RouterLink to="/review">колоду</RouterLink> или найдите слово в разделе <RouterLink to="/">«Поиск»</RouterLink> и нажмите «В колоду».</p>
    </template>
    <p v-else>Все слова этой колоды изучены. 🎉</p>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--accent);
  text-decoration: none;
}
h1 {
  font-size: 20px;
}
.left {
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}
.front {
  text-align: center;
  padding-top: 8vh;
}
.dir,
.hint,
.muted {
  color: var(--muted);
  font-size: 14px;
}
.prompt {
  font-size: 34px;
  font-weight: 600;
  margin: 16px 0 32px;
  overflow-wrap: anywhere;
}
button {
  min-height: 56px;
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
}
.articles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.articles button {
  font-size: 22px;
  font-weight: 700;
}
.articles .der {
  color: var(--der);
}
.articles .die {
  color: var(--die);
}
.articles .das {
  color: var(--das);
}
.skip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}
.skip .hint {
  margin-right: 4px;
}
.skip button {
  min-height: 48px;
  padding: 0 16px;
  font-size: 15px;
  color: var(--muted);
}
.show {
  width: 100%;
}
.verdict {
  margin: 0 0 12px;
  font-weight: 600;
}
.ok {
  color: var(--das);
}
.bad {
  color: var(--die);
}
/* Stay above the bottom nav (56 px), so the ratings are visible without scrolling. */
.grades {
  position: sticky;
  bottom: 56px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px 0;
  background: var(--bg);
}
.grades button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  padding: 4px;
  font-size: 15px;
}
.grades small {
  color: var(--muted);
  font-size: 12px;
}
.g1 span {
  color: var(--die);
}
.g3 span {
  color: var(--das);
}
.g4 span {
  color: var(--der);
}
kbd {
  font: 11px ui-monospace, monospace;
  color: var(--muted);
}
/* Key hints only for devices with a mouse and keyboard. */
@media (hover: none) {
  kbd {
    display: none;
  }
}
.empty {
  text-align: center;
  padding-top: 20vh;
  font-size: 18px;
}
</style>
