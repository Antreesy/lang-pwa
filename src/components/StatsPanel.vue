<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getStats } from '../db'

const s = ref<Awaited<ReturnType<typeof getStats>> | null>(null)
onMounted(async () => (s.value = await getStats()))
</script>

<template>
  <h2>Статистика</h2>
  <template v-if="s">
    <div class="tiles">
      <div class="tile">
        <span class="value">{{ s.dueToday }}</span>
        <span class="label">к повторению сегодня</span>
      </div>
      <div class="tile">
        <span class="value">{{ s.reviewedToday }}</span>
        <span class="label">повторено сегодня</span>
      </div>
      <div class="tile">
        <span class="value">{{ s.totalCards }}</span>
        <span class="label">карточек всего</span>
      </div>
    </div>

    <dl>
      <div>
        <dt>Новых слов сегодня</dt>
        <dd>{{ s.newWordsToday }}</dd>
      </div>
      <div>
        <dt>Правильных ответов сегодня</dt>
        <dd>{{ s.reviewedToday ? Math.round((s.correctToday / s.reviewedToday) * 100) + ' %' : '—' }}</dd>
      </div>
      <div>
        <dt>Слов в изучении</dt>
        <dd>{{ s.startedWords }} из {{ s.words }}</dd>
      </div>
      <div>
        <dt>Слов отмечено «Знаю»</dt>
        <dd>{{ s.knownWords }}</dd>
      </div>
      <div>
        <dt>Повторений за всё время</dt>
        <dd>{{ s.totalReviews }}</dd>
      </div>
    </dl>
  </template>
</template>

<style scoped>
h2 {
  font-size: 16px;
  color: var(--muted);
  margin: 8px 0 8px;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 8px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.value {
  font-size: 32px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.label {
  font-size: 13px;
  color: var(--muted);
}
dl {
  margin: 24px 0 0;
}
dl div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
dt {
  color: var(--muted);
}
dd {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
