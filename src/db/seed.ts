// Import public/data/*.json into IndexedDB at first start and after each data update.
import { db, type Sentence, type Word } from '.'

const CHUNK = 2000

async function getJson<T>(name: string): Promise<T> {
  const res = await fetch(import.meta.env.BASE_URL + 'data/' + name)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  return res.json()
}

/**
 * Import the dictionary if meta.json has a different version than the database.
 * Calls onProgress with 0..1. The deck is not touched.
 */
export async function importData(onProgress: (done: number) => void): Promise<void> {
  const current = await db.meta.get('dataVersion')
  let meta: { version: string }
  try {
    meta = await getJson('meta.json')
  } catch (e) {
    // Offline without cached files: the old dictionary is better than no app.
    if (current) return
    throw e
  }
  if (current?.value === meta.version) return

  onProgress(0)
  const [words, sentences] = await Promise.all([getJson<Word[]>('words.json'), getJson<Sentence[]>('sentences.json')])
  const total = words.length + sentences.length
  let done = 0
  async function putAll<T>(table: { bulkPut(rows: T[]): Promise<unknown> }, rows: T[]) {
    for (let i = 0; i < rows.length; i += CHUNK) {
      await table.bulkPut(rows.slice(i, i + CHUNK))
      done += Math.min(CHUNK, rows.length - i)
      onProgress(done / total)
    }
  }
  // One transaction: if the import stops, the old dictionary and old version stay.
  await db.transaction('rw', db.words, db.sentences, db.meta, async () => {
    await Promise.all([db.words.clear(), db.sentences.clear()])
    await putAll(db.words, words)
    await putAll(db.sentences, sentences)
    await db.meta.put({ key: 'dataVersion', value: meta.version })
  })
}
