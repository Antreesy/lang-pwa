// The only module that uses Dexie. Other code uses the functions and types from here,
// so that a change to PouchDB (for sync) stays in src/db/.
import Dexie, { type EntityTable } from 'dexie'
import type { Deck, DeckCard, Review } from './deck'

export type Gender = 'm' | 'f' | 'n'

/** One dictionary entry, as scripts/build-data.mjs writes it. */
export interface Word {
  id: string // "noun:Haus", stable between data builds
  rank: number // 0 = most frequent
  lemma: string
  pos: string
  ru: string[] // one string per sense
  en: string[]
  forms: string[] // lower case, lemma included
  keys?: string[] // fold(forms), added at import, search index
  genders?: Gender[]
  plural?: string | null
  verb?: { present3: string | null; past: string | null; participle: string | null; auxiliary: string[] }
  examples: number[] // Sentence ids
}

export interface Sentence {
  id: number // Tatoeba sentence id
  de: string
  ru?: string
  en?: string
}

interface Meta {
  key: string
  value: string
}

export const db = new Dexie('lang-pwa') as Dexie & {
  words: EntityTable<Word, 'id'>
  sentences: EntityTable<Sentence, 'id'>
  meta: EntityTable<Meta, 'key'>
  cards: EntityTable<DeckCard, 'id'>
  reviews: EntityTable<Review, 'id'>
  decks: EntityTable<Deck, 'id'>
}

db.version(1).stores({
  words: 'id, *forms, rank',
  sentences: 'id',
  meta: 'key',
})
// Version 2: search index on `keys` (forms without diacritics). Delete the data version, so the import runs again and fills `keys`.
db.version(2)
  .stores({ words: 'id, *keys, rank' })
  .upgrade(tx => tx.table('meta').delete('dataVersion'))
// Version 3: the deck. String ids (not auto-increment), so that sync between devices can merge them later.
db.version(3).stores({
  cards: 'id, wordId, fsrs.dueAt',
  reviews: 'id, at, cardId',
})
// Version 4: generated decks from decks.json. Import again to fill them.
db.version(4)
  .stores({ decks: 'id' })
  .upgrade(tx => tx.table('meta').delete('dataVersion'))

export { importData } from './seed'
export * from './deck'

/** Search key: lower case, no diacritics, ß → ss. So "Hauser" finds "Häuser", "Strasse" finds "Straße". */
export function fold(s: string): string {
  return s.trim().toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '')
}

/**
 * Words for a search string. `exact`: an inflected form is equal to the query ("ging" → gehen).
 * `more`: forms that start with the query, most frequent first, without the exact ones.
 * Diacritics are ignored. Order of exact results: lemma equal to the query ("schon", not "schonen" with imperative "schon!"),
 * then the exact spelling ("schon" before "schön"), then frequency.
 */
export async function searchWords(query: string, limit = 10): Promise<{ exact: Word[]; more: Word[] }> {
  const q = query.trim().toLowerCase()
  const key = fold(q)
  if (!key) return { exact: [], more: [] }
  const byRank = (a: Word, b: Word) => a.rank - b.rank
  const order = (w: Word) => (w.lemma.toLowerCase() === q ? 0 : fold(w.lemma) === key ? 1 : w.forms.includes(q) ? 2 : 3)
  const exact = (await db.words.where('keys').equals(key).toArray()).sort((a, b) => order(a) - order(b) || byRank(a, b))
  // shortcut: only the first 300 forms in alphabetical order are ranked, so a frequent word can be missing for a 1-letter query.
  const prefix = await db.words.where('keys').startsWith(key).limit(300).distinct().toArray()
  const ids = new Set(exact.map(w => w.id))
  return { exact, more: prefix.filter(w => !ids.has(w.id)).sort(byRank).slice(0, limit) }
}

export async function getWord(id: string): Promise<Word | undefined> {
  return db.words.get(id)
}

export async function getSentences(ids: number[]): Promise<Sentence[]> {
  return (await db.sentences.bulkGet(ids)).filter(s => s !== undefined)
}
