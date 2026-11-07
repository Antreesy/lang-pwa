// Deck cards and review history.
import { db } from '.'
import { newFsrsCard, review, type FsrsCard, type FsrsLog, type Grade } from '../srs'

/** de-ru: German on the front. ru-de: Russian on the front. */
export type Direction = 'de-ru' | 'ru-de'
export const DIRECTIONS: Direction[] = ['de-ru', 'ru-de']

export interface DeckCard {
  id: string // "noun:Haus|de-ru"
  wordId: string
  dir: Direction
  created: Date
  fsrs: FsrsCard
}

export interface Review {
  id: string // "<card id>@<time in ms>"
  cardId: string
  at: Date
  rating: Grade
  log: FsrsLog // full ts-fsrs log, for parameter training later
}

export async function isInDeck(wordId: string): Promise<boolean> {
  return (await db.cards.where('wordId').equals(wordId).count()) > 0
}

/** Add one card for each direction. Cards that exist keep their progress. */
export async function addToDeck(wordId: string): Promise<void> {
  const now = new Date()
  const existing = new Set(await db.cards.where('wordId').equals(wordId).primaryKeys())
  const cards: DeckCard[] = []
  for (const dir of DIRECTIONS) {
    const id = `${wordId}|${dir}`
    if (!existing.has(id)) cards.push({ id, wordId, dir, created: now, fsrs: await newFsrsCard(id, now) })
  }
  await db.cards.bulkAdd(cards)
}

/** Cards with due date before `until`, earliest first. */
export async function getDueCards(until: Date, limit = 200): Promise<DeckCard[]> {
  return db.cards.where('fsrs.dueAt').belowOrEqual(until).limit(limit).toArray()
}

/** The earliest due date in the deck, or null if the deck is empty. */
export async function getNextDue(): Promise<Date | null> {
  return (await db.cards.orderBy('fsrs.dueAt').first())?.fsrs.dueAt ?? null
}

/** Save a rating: new card state and one review log entry. */
export async function answerCard(card: DeckCard, grade: Grade, now = new Date()): Promise<void> {
  // ts-fsrs runs before the transaction: an await on a non-Dexie promise ends a Dexie transaction.
  const res = await review(card.fsrs, grade, now)
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put({ ...card, fsrs: res.card })
    await db.reviews.add({ id: `${card.id}@${now.getTime()}`, cardId: card.id, at: now, rating: grade, log: res.revlog })
  })
}
