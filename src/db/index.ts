// The only module that uses Dexie. Other code uses the functions and types from here,
// so that a change to PouchDB (for sync) stays in src/db/.
import Dexie, { type EntityTable } from 'dexie'

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
}

db.version(1).stores({
  words: 'id, *forms, rank',
  sentences: 'id',
  meta: 'key',
})

export { importData } from './seed'

/**
 * Words for a search string. `exact`: an inflected form is equal to the query ("ging" → gehen).
 * `more`: forms that start with the query, most frequent first, without the exact ones.
 */
export async function searchWords(query: string, limit = 10): Promise<{ exact: Word[]; more: Word[] }> {
  const q = query.trim().toLowerCase()
  if (!q) return { exact: [], more: [] }
  const byRank = (a: Word, b: Word) => a.rank - b.rank
  const exact = (await db.words.where('forms').equals(q).toArray()).sort(byRank)
  // shortcut: only the first 300 forms in alphabetical order are ranked, so a frequent word can be missing for a 1-letter query.
  const prefix = await db.words.where('forms').startsWith(q).limit(300).distinct().toArray()
  const ids = new Set(exact.map(w => w.id))
  return { exact, more: prefix.filter(w => !ids.has(w.id)).sort(byRank).slice(0, limit) }
}

export async function getWord(id: string): Promise<Word | undefined> {
  return db.words.get(id)
}

export async function getSentences(ids: number[]): Promise<Sentence[]> {
  return (await db.sentences.bulkGet(ids)).filter(s => s !== undefined)
}
