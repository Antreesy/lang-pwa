// Export and import of the deck (cards and reviews) as a JSON file. A backup until sync exists.
import { db } from '.'
import { DIRECTIONS, type DeckCard, type Review, type Skip } from './deck'

const APP = 'lang-pwa-deck'
// Format 2 adds skips («Знаю» / «Не нужно»). Format 1 files still import.
const FORMAT = 2
// JSON has no dates. These keys get a Date again when the file is read.
const DATE_KEYS = new Set(['created', 'dueAt', 'lastReviewAt', 'at', 'reviewTime'])

export interface Backup {
  cards: DeckCard[]
  reviews: Review[]
  skips: Skip[]
}

export async function exportDeck(): Promise<Blob> {
  const [cards, reviews, skips] = await Promise.all([db.cards.toArray(), db.reviews.toArray(), db.skips.toArray()])
  const data = { app: APP, format: FORMAT, exported: new Date(), cards, reviews, skips }
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
  if (data.format !== 1 && data.format !== FORMAT) throw new Error(`Неизвестная версия файла: ${data.format}.`)
  const skips = data.skips ?? []
  if (!Array.isArray(skips)) throw new Error('Это не резервная копия колоды.')
  for (const s of skips) {
    const ok = typeof s?.wordId === 'string' && ['known', 'ignored'].includes(s.reason) && isDate(s.at)
    if (!ok) throw new Error(`Неверная запись пропуска в файле: ${String(s?.wordId)}.`)
  }
  for (const c of data.cards) {
    const ok = typeof c?.id === 'string' && typeof c.wordId === 'string' && DIRECTIONS.includes(c.dir) &&
      c.id === `${c.wordId}|${c.dir}` && isDate(c.created) && isDate(c.fsrs?.dueAt) && Number.isInteger(c.fsrs.reps)
    if (!ok) throw new Error(`Неверная карточка в файле: ${String(c?.id)}.`)
  }
  for (const r of data.reviews) {
    const ok = typeof r?.id === 'string' && typeof r.cardId === 'string' && isDate(r.at) && [1, 2, 3, 4].includes(r.rating)
    if (!ok) throw new Error(`Неверная запись повторения в файле: ${String(r?.id)}.`)
  }
  return { cards: data.cards, reviews: data.reviews, skips }
}

/**
 * Merge a backup into the deck. A card in both places keeps the version with more reviews
 * (if equal: the later review), so an old backup does not delete newer progress. Reviews with the same id are the same review.
 */
export async function importDeck(b: Backup): Promise<{ cards: number; reviews: number }> {
  let changed = 0
  await db.transaction('rw', db.cards, db.reviews, db.skips, async () => {
    const local = new Map((await db.cards.bulkGet(b.cards.map(c => c.id))).filter(c => c !== undefined).map(c => [c.id, c]))
    const last = (c: DeckCard) => c.fsrs.lastReviewAt?.getTime() ?? 0
    const take = b.cards.filter(c => {
      const l = local.get(c.id)
      return !l || c.fsrs.reps > l.fsrs.reps || (c.fsrs.reps === l.fsrs.reps && last(c) > last(l))
    })
    await db.cards.bulkPut(take)
    await db.reviews.bulkPut(b.reviews)
    // A skip in the file does not delete local cards: a word with cards here stays in study.
    const withCards = new Set(await db.cards.where('wordId').anyOf(b.skips.map(s => s.wordId)).keys())
    await db.skips.bulkPut(b.skips.filter(s => !withCards.has(s.wordId)))
    changed = take.length
  })
  return { cards: changed, reviews: b.reviews.length }
}
