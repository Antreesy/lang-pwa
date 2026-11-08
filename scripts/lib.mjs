// Pure helpers for build-data.mjs. No file or network access here, so test.mjs can test them.

// Parts of speech that the app shows. Names, abbreviations, affixes and phrases are not kept.
export const KEEP_POS = new Set(['noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'num', 'det', 'particle', 'intj', 'postp'])

// Grammatical tags that mark a real inflected form (not a diminutive, synonym or other-gender pair).
const INFLECTION_TAGS = new Set(['nominative', 'genitive', 'dative', 'accusative', 'present', 'past',
  'participle-1', 'participle-2', 'subjunctive-i', 'subjunctive-ii', 'imperative', 'positive', 'comparative', 'superlative'])

const GENDER = { masculine: 'm', feminine: 'f', neuter: 'n' }

/**
 * Word tokens of a German sentence, case kept, so "Essen" (noun) and "essen" (verb) stay different.
 * The first word also gives a lower-case variant, because a capital letter there tells nothing.
 */
export function tokenize(text) {
  const tokens = text.match(/[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/g) ?? []
  if (tokens.length && tokens[0] !== tokens[0].toLowerCase()) tokens.push(tokens[0].toLowerCase())
  return tokens
}

/** Single-word inflected forms of a Kaikki entry, lemma included, case kept. */
export function entryForms(e) {
  const out = new Set([e.word])
  for (const f of e.forms ?? []) {
    if (!f.tags?.some(t => INFLECTION_TAGS.has(t))) continue
    const form = f.form.replace(/^am /, '').replace(/!$/, '')
    // shortcut: multi-word forms ("stehe auf", "gegangen sein") are not indexed, add split forms if search misses them.
    if (/^[A-Za-zÄÖÜäöüß-]+$/.test(form)) out.add(form)
  }
  return [...out]
}

/**
 * Forms that count for rank and example sentences. A form that is the lemma of another entry belongs to that entry:
 * "Haus" (genitive of der Hau) belongs to das Haus, "schon" (imperative of schonen) belongs to schon.
 */
export function ownForms(entry, lemmas) {
  return entry.forms.filter(f => f === entry.lemma || !lemmas.has(f))
}

/** Translations in one language: one string per sense, max 3 senses with max 3 words each. */
function translations(e, lang) {
  const bySense = new Map()
  for (const t of e.translations ?? []) {
    if (t.lang_code !== lang || !t.word) continue
    const key = t.sense_index ?? t.sense ?? ''
    const words = bySense.get(key) ?? []
    if (!words.includes(t.word) && words.length < 3) words.push(t.word)
    bySense.set(key, words)
  }
  return [...new Set([...bySense.values()].map(w => w.join(', ')))].slice(0, 3)
}

/** Compact app entry from one Kaikki line, or null if the app does not need it. */
export function compactEntry(e) {
  if (e.lang_code !== 'de' || !KEEP_POS.has(e.pos) || !/^[A-Za-zÄÖÜäöüß-]+$/.test(e.word)) return null
  // Pages for inflected forms ("ging", "Häuser") point to their lemma. The lemma page has the data.
  if (e.senses?.every(s => s.form_of || s.alt_of || s.tags?.includes('form-of'))) return null

  const ru = translations(e, 'ru')
  const en = translations(e, 'en')
  if (!ru.length && !en.length) return null

  const out = { lemma: e.word, pos: e.pos, ru, en, forms: entryForms(e) }
  if (e.pos === 'noun') {
    out.genders = [...new Set((e.tags ?? []).map(t => GENDER[t]).filter(Boolean))]
    const nomPl = (e.forms ?? []).find(f => f.tags?.includes('nominative') && f.tags.includes('plural') && f.form !== '—')
    out.plural = nomPl?.form ?? null
    const cats = new Set((e.categories ?? []).map(c => c.name ?? c))
    if (cats.has('Pluraletantum (Deutsch)')) out.pluralOnly = true
    // Adjectival nouns change with the article: die Erwachsene, eine Erwachsene, die Erwachsenen.
    if (cats.has('Adjektivische Deklination (Deutsch)')) {
      const nom = (number, re) => (e.forms ?? []).find(f => f.tags?.includes('nominative') && f.tags.includes(number) && re.test(f.form))?.form
      const forms = [nom('singular', /^(der|die|das) /), nom('singular', /^(ein|eine) /), nom('plural', /^die /)].filter(Boolean)
      if (forms.length >= 2) out.adjForms = forms
    }
  }
  if (e.pos === 'verb') {
    const f = e.forms ?? []
    const find = test => f.find(test)?.form ?? null
    out.verb = {
      present3: find(x => x.tags?.includes('present') && x.pronouns?.includes('er')),
      past: find(x => x.tags?.includes('past') && x.pronouns?.includes('ich')),
      participle: find(x => x.tags?.includes('participle-2')),
      // The conjugation table also has "auxiliary" tags on full phrases, so keep only the two auxiliaries.
      auxiliary: [...new Set(f.filter(x => x.tags?.includes('auxiliary') && ['haben', 'sein'].includes(x.form)).map(x => x.form))],
    }
  }
  return out
}

/** Sort key for example sentences: Russian translation first, then length near 45 characters (good for B1). */
export function sentenceScore(s) {
  return (s.ru ? 0 : 1000) + Math.abs(s.de.length - 45)
}

/** Past-tense forms of a verb: Präteritum (first word, "fing an" → "fing") and Partizip II. */
export function pastForms(entry) {
  if (!entry.verb) return new Set()
  const { past, participle } = entry.verb
  return new Set([past?.split(' ')[0], participle].filter(Boolean))
}
