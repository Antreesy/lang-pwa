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
