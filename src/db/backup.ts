// Export and import of the deck (cards and reviews) as a JSON file. A backup until sync exists.
import { db } from '.'
import { DIRECTIONS, type DeckCard, type Review } from './deck'

const APP = 'lang-pwa-deck'
const FORMAT = 1
// JSON has no dates. These keys get a Date again when the file is read.
const DATE_KEYS = new Set(['created', 'dueAt', 'lastReviewAt', 'at', 'reviewTime'])

export interface Backup {
  cards: DeckCard[]
  reviews: Review[]
}

export async function exportDeck(): Promise<Blob> {
  const [cards, reviews] = await Promise.all([db.cards.toArray(), db.reviews.toArray()])
  const data = { app: APP, format: FORMAT, exported: new Date(), cards, reviews }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

const isDate = (d: unknown) => d instanceof Date && !Number.isNaN(d.getTime())

/** Read and check a backup file. Throws an Error with a Russian message if the file is not correct. */
export function parseBackup(text: string): Backup {
  let data
  try {
    data = JSON.parse(text, (k, v) => (DATE_KEYS.has(k) && typeof v === 'string' ? new Date(v) : v))
  } catch {
    throw new Error('Файл не является JSON.')
  }
  if (data?.app !== APP || !Array.isArray(data.cards) || !Array.isArray(data.reviews)) {
    throw new Error('Это не резервная копия колоды.')
  }
  if (data.format !== FORMAT) throw new Error(`Неизвестная версия файла: ${data.format}.`)
  for (const c of data.cards) {
    const ok = typeof c?.id === 'string' && typeof c.wordId === 'string' && DIRECTIONS.includes(c.dir) &&
      c.id === `${c.wordId}|${c.dir}` && isDate(c.created) && isDate(c.fsrs?.dueAt) && Number.isInteger(c.fsrs.reps)
    if (!ok) throw new Error(`Неверная карточка в файле: ${String(c?.id)}.`)
  }
  for (const r of data.reviews) {
    const ok = typeof r?.id === 'string' && typeof r.cardId === 'string' && isDate(r.at) && [1, 2, 3, 4].includes(r.rating)
    if (!ok) throw new Error(`Неверная запись повторения в файле: ${String(r?.id)}.`)
  }
  return { cards: data.cards, reviews: data.reviews }
}

/**
 * Merge a backup into the deck. A card in both places keeps the version with more reviews
 * (if equal: the later review), so an old backup does not delete newer progress. Reviews with the same id are the same review.
 */
export async function importDeck(b: Backup): Promise<{ cards: number; reviews: number }> {
  let changed = 0
  await db.transaction('rw', db.cards, db.reviews, async () => {
    const local = new Map((await db.cards.bulkGet(b.cards.map(c => c.id))).filter(c => c !== undefined).map(c => [c.id, c]))
    const last = (c: DeckCard) => c.fsrs.lastReviewAt?.getTime() ?? 0
    const take = b.cards.filter(c => {
      const l = local.get(c.id)
      return !l || c.fsrs.reps > l.fsrs.reps || (c.fsrs.reps === l.fsrs.reps && last(c) > last(l))
    })
    await db.cards.bulkPut(take)
    await db.reviews.bulkPut(b.reviews)
    changed = take.length
  })
  return { cards: changed, reviews: b.reviews.length }
}
