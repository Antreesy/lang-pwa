<script setup lang="ts">
import type { Gender } from '../db'

defineProps<{ gender: Gender | 'pl' }>()

const ARTICLE = { m: 'der', f: 'die', n: 'das', pl: 'die' } as const
</script>

<template>
  <span :class="['article', gender]" lang="de">{{ ARTICLE[gender] }}</span>
</template>

<style scoped>
.article {
  font-weight: 700;
}
.m {
  color: var(--der);
}
.f {
  color: var(--die);
}
.n {
  color: var(--das);
}
/* The plural article is always "die": no colour, so that it does not look like a feminine noun. */
.pl {
  font-weight: inherit;
}
</style>
