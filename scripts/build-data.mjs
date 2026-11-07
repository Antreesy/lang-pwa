// Download Tatoeba and Kaikki data, write small JSON files to public/data/.
// Usage: node scripts/build-data.mjs [maxWords]
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { compactEntry, ownForms, sentenceScore, tokenize } from './lib.mjs'
import { buildDecks, groupsOf } from './decks.mjs'

const MAX_WORDS = Number(process.argv[2] ?? 10000)
const EXAMPLES_PER_WORD = 5
const CACHE = new URL('../.cache/', import.meta.url).pathname
const OUT = new URL('../public/data/', import.meta.url).pathname
const TATOEBA = 'https://downloads.tatoeba.org/exports/per_language/'
const FILES = {
  'deu_sentences.tsv.bz2': TATOEBA + 'deu/deu_sentences.tsv.bz2',
  'deu-rus_links.tsv.bz2': TATOEBA + 'deu/deu-rus_links.tsv.bz2',
  'deu-eng_links.tsv.bz2': TATOEBA + 'deu/deu-eng_links.tsv.bz2',
  'rus_sentences.tsv.bz2': TATOEBA + 'rus/rus_sentences.tsv.bz2',
  'eng_sentences.tsv.bz2': TATOEBA + 'eng/eng_sentences.tsv.bz2',
  'kaikki-de.jsonl.gz': 'https://kaikki.org/dewiktionary/Deutsch/kaikki.org-dictionary-Deutsch.jsonl.gz',
}

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

async function download(name, url) {
  const file = CACHE + name
  if (existsSync(file)) return
  log('download', url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  // Write to a temporary file first, so a stopped download does not look complete.
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file + '.part'))
  renameSync(file + '.part', file)
}

/** Lines of a .bz2 (system bunzip2) or .gz file. */
async function* lines(name) {
  const file = CACHE + name
  let input, done
  if (name.endsWith('.bz2')) {
    const p = spawn('bunzip2', ['-c', file], { stdio: ['ignore', 'pipe', 'inherit'] })
    done = new Promise((ok, fail) => p.on('close', c => c ? fail(new Error(`bunzip2 ${name}: exit ${c}`)) : ok()))
    input = p.stdout
  } else {
    input = createReadStream(file).pipe(createGunzip())
  }
  yield* createInterface({ input, crlfDelay: Infinity })
  await done
}

/** Map German sentence id → first linked sentence id. */
async function readLinks(name) {
  const map = new Map()
  for await (const l of lines(name)) {
    const [de, other] = l.split('\t')
    if (!map.has(de)) map.set(de, other)
  }
  return map
}

/** Texts of the sentences with the given ids. */
async function readTexts(name, ids) {
  const map = new Map()
  for await (const l of lines(name)) {
    const [id, , text] = l.split('\t')
    if (ids.has(id)) map.set(id, text)
  }
  return map
}

mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT, { recursive: true })
for (const [name, url] of Object.entries(FILES)) await download(name, url)

// 1. Tatoeba: word counts from all German sentences, plus translated sentences as example candidates.
log('read Tatoeba links')
const ruLinks = await readLinks('deu-rus_links.tsv.bz2')
const enLinks = await readLinks('deu-eng_links.tsv.bz2')
const ruTexts = await readTexts('rus_sentences.tsv.bz2', new Set(ruLinks.values()))
const enTexts = await readTexts('eng_sentences.tsv.bz2', new Set(enLinks.values()))

log('read German sentences')
const counts = new Map()
const candidates = []
for await (const l of lines('deu_sentences.tsv.bz2')) {
  const [id, , de] = l.split('\t')
  const tokens = tokenize(de)
  // tokens[0] is the first word with its capital letter. Its lower-case variant is at the end.
  for (const t of tokens.slice(1)) counts.set(t, (counts.get(t) ?? 0) + 1)
  const ru = ruTexts.get(ruLinks.get(id))
  const en = enTexts.get(enLinks.get(id))
  if ((ru || en) && de.length >= 15 && de.length <= 100) candidates.push({ id: Number(id), de, ru, en, tokens })
}
log(`${counts.size} distinct tokens, ${candidates.length} example candidates`)

// 2. Kaikki: keep lemmas with translations, rank them by how often their forms occur in Tatoeba.
log('read Kaikki (this takes some minutes)')
let entries = []
const lemmas = new Set()
const seenIds = new Map()
const groups = new Map() // word id → deck group keys
for await (const l of lines('kaikki-de.jsonl.gz')) {
  const raw = JSON.parse(l)
  // First names are not words of the app, but a form equal to a name belongs to the name: "Maria" is not the plural of das Mare.
  if (raw.lang_code === 'de' && raw.pos === 'name' && raw.pos_title === 'Vorname') lemmas.add(raw.word)
  const e = compactEntry(raw)
  if (!e) continue
  lemmas.add(e.lemma)
  // The id must not change when the data is built again, because deck cards refer to it.
  // So it uses Kaikki file order for homonyms, not the rank.
  const base = `${e.pos}:${e.lemma}`
  const n = (seenIds.get(base) ?? 0) + 1
  seenIds.set(base, n)
  if (!e.forms.some(f => counts.has(f))) continue
  const id = n === 1 ? base : `${base}#${n}`
  entries.push({ id, ...e })
  groups.set(id, groupsOf(e, raw))
}
// All lemmas are known only after the full file, so the score comes after the loop.
const score = new Map(entries.map(e => [e.id, ownForms(e, lemmas).reduce((sum, f) => sum + (counts.get(f) ?? 0), 0)]))
entries = entries.filter(e => score.get(e.id) > 0).sort((a, b) => score.get(b.id) - score.get(a.id))
const words = entries.slice(0, MAX_WORDS).map((e, rank) => ({ ...e, rank, examples: [] }))
log(`${entries.length} ranked entries, keep ${words.length}`)

// 3. Example sentences: the best few per word, by sentenceScore. Only own forms, so "Haus" gives no examples to der Hau.
const byForm = new Map()
for (const w of words) for (const f of ownForms(w, lemmas)) byForm.set(f, [...(byForm.get(f) ?? []), w])
const best = new Map(words.map(w => [w.id, []]))
for (const s of candidates) {
  const score = sentenceScore(s)
  const seen = new Set()
  for (const t of s.tokens) for (const w of byForm.get(t) ?? []) {
    if (seen.has(w.id)) continue
    seen.add(w.id)
    const list = best.get(w.id)
    if (list.length === EXAMPLES_PER_WORD && score >= list.at(-1).score) continue
    list.push({ s, score })
    list.sort((a, b) => a.score - b.score)
    if (list.length > EXAMPLES_PER_WORD) list.pop()
  }
}
const used = new Map()
for (const w of words) for (const { s } of best.get(w.id)) {
  w.examples.push(s.id)
  used.set(s.id, { id: s.id, de: s.de, ...(s.ru ? { ru: s.ru } : { en: s.en }) })
}
// Search in the app ignores case.
for (const w of words) w.forms = [...new Set(w.forms.map(f => f.toLowerCase()))]
const sentences = [...used.values()]
const decks = buildDecks(words, groups)

// 4. Output. The app imports the files again when meta.version changes.
// The version is a hash of the data, so a new build with the same data causes no import on the devices.
const files = { 'words.json': JSON.stringify(words), 'sentences.json': JSON.stringify(sentences), 'decks.json': JSON.stringify(decks) }
const hash = createHash('sha256')
for (const text of Object.values(files)) hash.update(text)
const meta = { version: hash.digest('hex').slice(0, 16), built: new Date().toISOString(), words: words.length, sentences: sentences.length, decks: decks.length }
for (const [name, text] of Object.entries(files)) writeFileSync(OUT + name, text)
writeFileSync(OUT + 'meta.json', JSON.stringify(meta, null, 2) + '\n')
log('done', meta)
