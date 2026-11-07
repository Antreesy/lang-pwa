// Pure helpers that put words into generated decks (grammar groups and topics). Used by build-data.mjs.

const DECK_SIZE = 50 // target words per deck; a group splits into parts of equal size
const MIN_WORDS = 8 // smaller groups give no deck
const MAX_GRAMMAR_WORDS = 300 // most frequent words of each grammar group

export const GRAMMAR = {
  'verb-strong': 'Сильные и неправильные глаголы',
  'verb-separable': 'Глаголы с отделяемой приставкой',
  'verb-sein': 'Глаголы с sein в Perfekt',
  'noun-m': 'Существительные: der',
  'noun-f': 'Существительные: die',
  'noun-n': 'Существительные: das',
  'noun-plural-only': 'Только множественное число',
  'noun-adjectival': 'Существительные как прилагательные (der Erwachsene)',
}

// Topic → Wiktionary hypernyms of the main meaning.
export const TOPICS = {
  animals: ['Животные', ['Tier', 'Säugetier', 'Vogel', 'Insekt', 'Fisch', 'Haustier', 'Nutztier', 'Raubtier', 'Reptil', 'Wirbeltier', 'Singvogel', 'Huftier', 'Nagetier', 'Amphibie']],
  food: ['Еда и напитки', ['Lebensmittel', 'Nahrungsmittel', 'Speise', 'Gericht', 'Getränk', 'Obst', 'Frucht', 'Kernobst', 'Steinobst', 'Gemüse', 'Gebäck', 'Backware', 'Gewürz', 'Süßigkeit', 'Fleisch', 'Milchprodukt', 'Mahlzeit', 'alkoholisches Getränk', 'Spirituose']],
  clothes: ['Одежда', ['Kleidung', 'Kleidungsstück', 'Schuh', 'Kopfbedeckung', 'Schmuck', 'Accessoire']],
  jobs: ['Профессии', ['Beruf', 'Handwerker', 'Arbeitnehmer', 'Angestellter']],
  home: ['Дом и квартира', ['Raum', 'Zimmer', 'Möbel', 'Möbelstück', 'Haushaltsgerät', 'Gebäude', 'Gebäudeteil', 'Wohnung', 'Küchengerät', 'Geschirr', 'Besteck']],
  body: ['Тело и здоровье', ['Körperteil', 'Organ', 'Krankheit', 'Medikament', 'Arzneimittel', 'Verletzung', 'Symptom']],
  time: ['Время', ['Zeit', 'Zeitraum', 'Zeitpunkt', 'Zeitabschnitt', 'Zeiteinheit', 'Tag', 'Wochentag', 'Monat', 'Jahreszeit', 'Tageszeit', 'Feiertag']],
  feelings: ['Чувства', ['Gefühl', 'Emotion', 'Empfindung', 'Stimmung', 'Charaktereigenschaft']],
  transport: ['Транспорт и дорога', ['Fahrzeug', 'Verkehrsmittel', 'Kraftfahrzeug', 'Wasserfahrzeug', 'Luftfahrzeug', 'Straße']],
  family: ['Семья и люди', ['Verwandter', 'Familienmitglied', 'Elternteil', 'Angehöriger', 'Familie']],
  nature: ['Природа и погода', ['Pflanze', 'Baum', 'Blume', 'Wetter', 'Niederschlag', 'Gewässer', 'Erhebung', 'Landschaft', 'Naturerscheinung', 'Himmelskörper']],
  countries: ['Страны и языки', ['Land', 'Staat', 'Sprache', 'Europäer', 'europäisch', 'Einwohner', 'Bewohner', 'Kontinent']],
  colors: ['Цвета', ['Farbe']],
  numbers: ['Числа и меры', ['Zahl', 'Zahlwort', 'Kardinalzahl', 'Maßeinheit', 'Längenmaß', 'Gewichtseinheit', 'Währungseinheit']],
  tools: ['Вещи и инструменты', ['Werkzeug', 'Gerät', 'Behälter', 'Gefäß', 'Instrument', 'Musikinstrument']],
  sport: ['Спорт и игры', ['Sport', 'Sportart', 'Spiel', 'Ballspiel', 'Kartenspiel', 'Brettspiel']],
}
const TOPIC_OF = new Map(Object.entries(TOPICS).flatMap(([key, [, hyps]]) => hyps.map(h => [h, key])))

/** Hypernyms of the main meaning: sense index "1", "1, 2" or "1–3". */
export function mainHypernyms(raw) {
  return (raw.hypernyms ?? []).filter(h => h.word && (!h.sense_index || /^1(?!\d)/.test(h.sense_index))).map(h => h.word)
}

/** True for strong, mixed and irregular verbs: the past is not stem + "te" (machen → machte, arbeiten → arbeitete). */
export function isStrongVerb(lemma, verb) {
  if (!verb?.past) return false
  const [past, prefix] = verb.past.split(' ') // "stand auf" → "stand", "auf"
  const base = prefix && lemma.startsWith(prefix) ? lemma.slice(prefix.length) : lemma
  const stem = base.replace(/e?n$/, '')
  return !new RegExp(`^${stem}e?te$`).test(past)
}

/** Group keys ("grammar:verb-strong", "topic:food") of one entry. `compact` is from compactEntry, `raw` is the Kaikki line. */
export function groupsOf(compact, raw) {
  const out = []
  const cats = new Set((raw.categories ?? []).map(c => c.name ?? c))
  if (compact.pos === 'verb') {
    if (isStrongVerb(compact.lemma, compact.verb)) out.push('grammar:verb-strong')
    if (compact.verb?.present3?.includes(' ')) out.push('grammar:verb-separable')
    if (compact.verb?.auxiliary.includes('sein')) out.push('grammar:verb-sein')
  }
  if (compact.pos === 'noun') {
    if (compact.genders?.length === 1) out.push(`grammar:noun-${compact.genders[0]}`)
    if (cats.has('Pluraletantum (Deutsch)')) out.push('grammar:noun-plural-only')
    if (cats.has('Adjektivische Deklination (Deutsch)')) out.push('grammar:noun-adjectival')
  }
  for (const h of mainHypernyms(raw)) if (TOPIC_OF.has(h)) out.push(`topic:${TOPIC_OF.get(h)}`)
  return [...new Set(out)]
}

/**
 * Decks from group keys. `words` are in rank order, `groups` maps word id → group keys.
 * Ids such as "topic:food:2" stay the same between builds, but the words in a part can change.
 */
export function buildDecks(words, groups) {
  const members = new Map()
  const seen = new Set() // "group|lemma": homonyms (die Mutter: mother, nut) go into a deck only once, the most frequent one
  for (const w of words) for (const g of groups.get(w.id) ?? []) {
    if (seen.has(`${g}|${w.lemma}`)) continue
    seen.add(`${g}|${w.lemma}`)
    members.set(g, [...(members.get(g) ?? []), w.id])
  }
  const decks = []
  const keys = [...Object.keys(GRAMMAR).map(k => `grammar:${k}`), ...Object.keys(TOPICS).map(k => `topic:${k}`)]
  for (const key of keys) {
    const [kind, name] = key.split(':')
    let ids = members.get(key) ?? []
    if (kind === 'grammar') ids = ids.slice(0, MAX_GRAMMAR_WORDS)
    if (ids.length < MIN_WORDS) continue
    const parts = Math.ceil(ids.length / DECK_SIZE)
    const size = Math.ceil(ids.length / parts)
    for (let p = 0; p < parts; p++) {
      decks.push({
        id: `${key}:${p + 1}`,
        kind,
        name: kind === 'grammar' ? GRAMMAR[name] : TOPICS[name][0],
        part: parts > 1 ? p + 1 : null,
        words: ids.slice(p * size, (p + 1) * size),
      })
    }
  }
  return decks
}
