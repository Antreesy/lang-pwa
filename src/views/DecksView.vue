<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ALL, deckList, type Deck, type DeckStats } from '../db'

const data = ref<Awaited<ReturnType<typeof deckList>> | null>(null)
onMounted(async () => (data.value = await deckList()))

type Row = Deck & DeckStats

// One card per group; the parts of a group ("Глаголы 1…6") are buttons on that card.
const sections = computed(() => {
  const groups = new Map<string, Row[]>()
  for (const d of data.value?.decks ?? []) groups.set(d.name, [...(groups.get(d.name) ?? []), d])
  const list = [...groups.values()].map(parts => ({
    name: parts[0].name,
    kind: parts[0].kind,
    parts,
    due: parts.reduce((n, p) => n + p.due, 0),
    learned: parts.reduce((n, p) => n + p.learned, 0),
    total: parts.reduce((n, p) => n + p.total, 0),
  }))
  return [
    { title: 'Грамматика', groups: list.filter(g => g.kind === 'grammar') },
    { title: 'Темы', groups: list.filter(g => g.kind === 'topic') },
  ]
})

const link = (id: string) => `/review/${encodeURIComponent(id)}`
const percent = (s: { learned: number; total: number }) => (s.total ? Math.round((s.learned / s.total) * 100) : 0)
</script>

<template>
  <h1>Учить</h1>
  <template v-if="data">
    <p class="muted">Новых слов сегодня: {{ data.newToday }}</p>

    <RouterLink :to="link(ALL)" class="deck all">
      <span class="name">Все мои карточки</span>
      <span class="counts">
        <b v-if="data.all.due">{{ data.all.due }} к повторению</b>
        <template v-else>нет повторений</template>
        · слов: {{ data.all.total }}
      </span>
    </RouterLink>

    <section v-for="s in sections" :key="s.title">
      <h2>{{ s.title }}</h2>
      <template v-for="g in s.groups" :key="g.name">
        <RouterLink v-if="g.parts.length === 1" :to="link(g.parts[0].id)" class="deck">
          <span class="name">{{ g.name }}</span>
          <span class="counts"><b v-if="g.due">{{ g.due }} к повторению · </b>{{ g.learned }}/{{ g.total }} слов</span>
          <span class="bar" :style="{ '--p': percent(g) + '%' }" />
        </RouterLink>
        <div v-else class="deck">
          <span class="name">{{ g.name }}</span>
          <span class="counts"><b v-if="g.due">{{ g.due }} к повторению · </b>{{ g.learned }}/{{ g.total }} слов</span>
          <div class="parts">
            <RouterLink
              v-for="p in g.parts"
              :key="p.id"
              :to="link(p.id)"
              class="part"
              :style="{ '--p': percent(p) + '%' }"
              :aria-label="`${g.name}, часть ${p.part}: ${p.learned} из ${p.total}${p.due ? `, ${p.due} к повторению` : ''}`"
            >
              {{ p.part }}<b v-if="p.due" class="dot" />
            </RouterLink>
          </div>
        </div>
      </template>
    </section>
  </template>
</template>

<style scoped>
h2 {
  font-size: 16px;
  color: var(--muted);
  margin: 24px 0 8px;
}
.muted {
  color: var(--muted);
  font-size: 14px;
  margin-top: -8px;
}
.deck {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 56px;
  padding: 10px 16px;
  margin-bottom: 8px;
  color: var(--text);
  text-decoration: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.deck.all {
  border-color: var(--accent);
}
.name {
  font-size: 17px;
}
.counts {
  font-size: 13px;
  color: var(--muted);
}
.counts b {
  color: var(--accent);
  font-weight: 600;
}
.parts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
/* Part button: the bottom line shows progress. */
.part {
  position: relative;
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  color: var(--text);
  text-decoration: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  background:
    linear-gradient(to right, var(--das) var(--p), var(--border) var(--p)) bottom / 100% 4px no-repeat,
    var(--bg);
}
.dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}
.bar {
  height: 4px;
  margin-top: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--das) var(--p), var(--border) var(--p));
}
</style>
