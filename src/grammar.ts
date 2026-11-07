// Grammar parts that a card asks for, and the check of a typed answer. Pure functions, no database.
import type { Word } from './db'

export const ARTICLE = { m: 'der', f: 'die', n: 'das' } as const

/** Search and check key: lower case, no diacritics, ß → ss. So "Hauser" = "Häuser". */
export function fold(s: string): string {
  return s.trim().toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '')
}

/** True if "er …" is not stem + t/et (fährt, liest, hat, kann), or the verb is separable (steht auf). */
export function showPresent(lemma: string, present3: string | null): boolean {
  if (!present3) return false
  if (present3.includes(' ')) return true
  const stem = lemma.replace(/e?n$/, '')
  return present3 !== `${stem}t` && present3 !== `${stem}et`
}

/** Verb forms to learn: ["steht auf", "stand auf", "ist aufgestanden"]. The present form only if showPresent(). */
export function verbParts(w: Word): string[] {
  const v = w.verb
  if (!v) return []
  const aux = v.auxiliary.map(a => ({ haben: 'hat', sein: 'ist' })[a] ?? a).join('/')
  return [
    showPresent(w.lemma, v.present3) ? v.present3 : null,
    v.past,
    v.participle ? `${aux} ${v.participle}`.trim() : null,
  ].filter((p): p is string => !!p)
}

/** Noun forms to learn: ["das Haus", "die Häuser"], adjectival forms, or ["die Eltern"] for plural-only nouns. */
export function nounParts(w: Word): string[] {
  if (w.pos !== 'noun') return []
  if (w.adjForms?.length) return w.adjForms
  if (w.pluralOnly) return [`die ${w.lemma}`]
  if (w.genders?.length !== 1) return [] // two genders (der/das Joghurt): no single answer
  return [`${ARTICLE[w.genders[0]]} ${w.lemma}`, ...(w.plural ? [`die ${w.plural}`] : [])]
}

export interface PartResult {
  part: string
  ok: boolean
}

/** Parts for the answer check. The plural article is always "die", so it is optional: "(die) Häuser". */
export function checkParts(w: Word, parts: string[]): string[] {
  return parts.map(p => (w.plural && p === `die ${w.plural}` ? `(die) ${w.plural}` : p))
}

/**
 * Check the German words in a typed answer. Each expected part is correct if all its words are in the answer;
 * a word in parentheses is optional. Order, commas, case and missing umlauts do not matter.
 * Cyrillic words are the Russian meaning: they are returned for comparison.
 */
export function checkAnswer(typed: string, expected: string[]): { parts: PartResult[]; russian: string } {
  const words = typed.split(/[\s,;·—–\-/]+/).filter(Boolean)
  const russian = words.filter(t => /\p{Script=Cyrillic}/u.test(t)).join(' ')
  const german = new Set(words.filter(t => !/\p{Script=Cyrillic}/u.test(t)).map(fold))
  const required = (part: string) => part.split(/\s+/).filter(t => !t.startsWith('('))
  return {
    parts: expected.map(part => ({ part, ok: required(part).every(t => german.has(fold(t))) })),
    russian,
  }
}
