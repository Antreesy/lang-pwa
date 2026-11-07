<script setup lang="ts">
import type { Gender } from '../db'

defineProps<{ gender: Gender | 'pl' }>()

const ARTICLE = { m: 'der', f: 'die', n: 'das', pl: 'die' } as const
</script>

<template>
  <span :class="['article', ARTICLE[gender]]" lang="de">{{ ARTICLE[gender] }}</span>
</template>

<style scoped>
.article {
  font-weight: 700;
}
.der {
  color: var(--der);
}
.die {
  color: var(--die);
}
.das {
  color: var(--das);
}
</style>
