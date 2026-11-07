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

/** A word that the user skipped on a new card. It does not come back in any deck. */
export interface Skip {
  wordId: string
  reason: 'known' | 'ignored' // «Знаю» | «Не нужно»
  at: Date
}

export async function isInDeck(wordId: string): Promise<boolean> {
  return (await db.cards.where('wordId').equals(wordId).count()) > 0
}

/** Add one card for each direction. Cards that exist keep their progress. A skip of the word is deleted. */
export async function addToDeck(wordId: string): Promise<void> {
  const now = new Date()
  const existing = new Set(await db.cards.where('wordId').equals(wordId).primaryKeys())
  const cards: DeckCard[] = []
  for (const dir of DIRECTIONS) {
    const id = `${wordId}|${dir}`
    if (!existing.has(id)) cards.push({ id, wordId, dir, created: now, fsrs: await newFsrsCard(id, now) })
  }
  await db.transaction('rw', db.cards, db.skips, async () => {
    await db.cards.bulkAdd(cards)
    await db.skips.delete(wordId)
  })
}

/** «Знаю» / «Не нужно»: the word leaves all decks. Its cards are deleted; the review history stays. */
export async function skipWord(wordId: string, reason: Skip['reason']): Promise<void> {
  await db.transaction('rw', db.cards, db.skips, async () => {
    await db.cards.where('wordId').equals(wordId).delete()
    await db.skips.put({ wordId, reason, at: new Date() })
  })
}

/** A generated deck from decks.json. */
export interface Deck {
  id: string // "topic:food:2"
  kind: 'grammar' | 'topic'
  name: string
  part: number | null
  words: string[] // word ids, most frequent first
  order: number // position in decks.json, added at import
}

/** Deck id for "all cards" (all words with cards, also words added with the "В колоду" button). */
export const ALL = 'all'
// If nothing is due now, show cards due in the next 20 minutes (learning steps), as Anki does.
const LEARN_AHEAD_MS = 20 * 60 * 1000

export interface DeckStats {
  due: number // cards to review now
  fresh: number // words not started
  learned: number // words with at least one review
  total: number
}

const wordOf = (cardId: string) => cardId.slice(0, cardId.lastIndexOf('|'))

function startOfDay(now: Date): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Words reviewed today, and the number of them with their first review ever today (new words). */
async function today(now: Date) {
  const start = startOfDay(now)
  const rows = await db.reviews.where('at').aboveOrEqual(start).toArray()
  const reviewed = new Set(rows.map(r => wordOf(r.cardId)))
  let newWords = 0
  for (const w of new Set(rows.filter(r => r.log.state === 0).map(r => wordOf(r.cardId)))) {
    const ids = DIRECTIONS.map(d => `${w}|${d}`)
    if (!(await db.reviews.where('cardId').anyOf(ids).filter(r => r.at < start).count())) newWords++
  }
  return { reviewed, newWords }
}

export async function newWordsToday(now = new Date()): Promise<number> {
  return (await today(now)).newWords
}

/** Counts for a word list. A «Знаю» word counts as learned; a «Не нужно» word is not in the total. */
function statsOf(words: string[], cardsByWord: Map<string, DeckCard[]>, skips: Map<string, Skip>, now: Date): DeckStats {
  let due = 0
  let learned = 0
  let total = 0
  for (const w of words) {
    const skip = skips.get(w)
    if (skip?.reason === 'ignored') continue
    total++
    const cards = cardsByWord.get(w) ?? []
    due += cards.filter(c => c.fsrs.reps > 0 && c.fsrs.dueAt <= now).length
    if (skip || cards.some(c => c.fsrs.reps > 0)) learned++
  }
  return { due, fresh: total - learned, learned, total }
}

/** Decks with counts, for the deck list. */
export async function deckList(now = new Date()) {
  // shortcut: reads all cards, fast up to some 10,000 cards; use index queries if the deck gets larger.
  const [cards, skipRows] = await Promise.all([db.cards.toArray(), db.skips.toArray()])
  const skips = new Map(skipRows.map(s => [s.wordId, s]))
  const byWord = new Map<string, DeckCard[]>()
  for (const c of cards) byWord.set(c.wordId, [...(byWord.get(c.wordId) ?? []), c])
  const decks = (await db.decks.toArray()).sort((a, b) => a.order - b.order)
  return {
    all: statsOf([...byWord.keys()], byWord, skips, now),
    decks: decks.map(d => ({ ...d, ...statsOf(d.words, byWord, skips, now) })),
    newToday: await newWordsToday(now),
  }
}

/** Numbers for the stats screen. */
export async function getStats(now = new Date()) {
  const endOfDay = new Date(startOfDay(now).getTime() + 86400000)
  const cards = await db.cards.toArray()
  const reviewsToday = await db.reviews.where('at').aboveOrEqual(startOfDay(now)).toArray()
  const started = new Set(cards.filter(c => c.fsrs.reps > 0).map(c => c.wordId))
  return {
    dueToday: cards.filter(c => c.fsrs.reps > 0 && c.fsrs.dueAt < endOfDay).length,
    reviewedToday: reviewsToday.length,
    correctToday: reviewsToday.filter(r => r.rating > 1).length,
    newWordsToday: await newWordsToday(now),
    totalCards: cards.length,
    words: new Set(cards.map(c => c.wordId)).size,
    startedWords: started.size,
    totalReviews: await db.reviews.count(),
    knownWords: await db.skips.filter(s => s.reason === 'known').count(),
  }
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  return db.decks.get(id)
}

/** Cards answered in this session. The other direction of such a word waits for the next session. */
export interface Session {
  doneCards: Set<string>
  doneWords: Set<string>
}

export type NextCard =
  | { card: DeckCard; left: number }
  | { card: null; nextDue: Date | null; newTomorrow: boolean }

/**
 * Next card of a deck (or ALL), in this order:
 * 1. due reviews;
 * 2. new cards of words started before today (the other direction), no limit;
 * 3. new words, no daily limit; a generated deck makes cards for its next word;
 * 4. learning cards due within LEARN_AHEAD_MS.
 * A new card of a word reviewed today waits until tomorrow, as "bury siblings" in Anki.
 */
export async function nextCard(deckId: string, s: Session, now = new Date()): Promise<NextCard> {
  const deck = deckId === ALL ? undefined : await db.decks.get(deckId)
  const cards = deck ? await db.cards.where('wordId').anyOf(deck.words).toArray() : await db.cards.toArray()
  const allowed = (c: DeckCard) => !s.doneWords.has(c.wordId) || s.doneCards.has(c.id)
  const byDue = (a: DeckCard, b: DeckCard) => a.fsrs.dueAt.getTime() - b.fsrs.dueAt.getTime()
  const { reviewed } = await today(now)

  const reviews = cards.filter(c => c.fsrs.reps > 0)
  const due = reviews.filter(c => c.fsrs.dueAt <= now && allowed(c)).sort(byDue)
  const started = new Set(reviews.map(c => c.wordId))

  // New cards in deck order (most frequent word first), DE→RU before RU→DE.
  const rank = new Map((deck?.words ?? []).map((w, i) => [w, i]))
  const newCards = cards
    .filter(c => c.fsrs.reps === 0)
    .sort((a, b) => (rank.get(a.wordId) ?? 0) - (rank.get(b.wordId) ?? 0) || a.created.getTime() - b.created.getTime() || a.dir.localeCompare(b.dir))
  const buried = newCards.filter(c => reviewed.has(c.wordId))
  const otherDir = newCards.filter(c => !reviewed.has(c.wordId) && started.has(c.wordId))
  const fresh = newCards.filter(c => !reviewed.has(c.wordId) && !started.has(c.wordId))
  const withCards = new Set(cards.map(c => c.wordId))
  const skipped = new Set(deck ? await db.skips.where('wordId').anyOf(deck.words).primaryKeys() : [])
  const unstarted = deck ? deck.words.filter(w => !withCards.has(w) && !skipped.has(w)) : []
  const freshWords = new Set(fresh.map(c => c.wordId)).size + unstarted.length

  let card: DeckCard | undefined = due[0] ?? otherDir[0]
  if (!card) {
    card = fresh[0]
    if (!card && unstarted.length) {
      await addToDeck(unstarted[0])
      card = await db.cards.get(`${unstarted[0]}|de-ru`)
    }
  }
  card ??= reviews.filter(c => c.fsrs.dueAt.getTime() <= now.getTime() + LEARN_AHEAD_MS && allowed(c)).sort(byDue)[0]
  if (card) return { card, left: due.length + otherDir.length + freshWords }

  return { card: null, nextDue: reviews.sort(byDue)[0]?.fsrs.dueAt ?? null, newTomorrow: buried.length > 0 }
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
