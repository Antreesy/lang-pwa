<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { addToDeck, isInDeck } from '../db'

const props = defineProps<{ wordId: string }>()
const inDeck = ref(false)

watchEffect(async () => {
  const id = props.wordId
  const res = await isInDeck(id)
  if (id === props.wordId) inDeck.value = res
})

async function add() {
  await addToDeck(props.wordId)
  inDeck.value = true
}
</script>

<template>
  <button v-if="!inDeck" class="add" @click="add">+ В колоду</button>
  <p v-else class="in-deck" role="status">✓ В колоде</p>
</template>

<style scoped>
.add {
  width: 100%;
  min-height: 48px;
  margin-top: 12px;
  font: inherit;
  font-weight: 600;
  color: var(--on-accent);
  background: var(--accent);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.in-deck {
  margin: 12px 0 0;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}
</style>
