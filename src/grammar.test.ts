// Run with: npm test (Node strips the types).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkAnswer, checkParts, nounParts, showPresent, verbParts } from './grammar.ts'

const word = (w: object) => ({ id: 'x', rank: 0, ru: [], en: [], forms: [], examples: [], ...w }) as Parameters<typeof verbParts>[0]

test('showPresent: only irregular or separable', () => {
  assert.equal(showPresent('machen', 'macht'), false)
  assert.equal(showPresent('arbeiten', 'arbeitet'), false)
  assert.equal(showPresent('reisen', 'reist'), false)
  assert.equal(showPresent('lächeln', 'lächelt'), false)
  assert.equal(showPresent('fahren', 'fährt'), true)
  assert.equal(showPresent('lesen', 'liest'), true)
  assert.equal(showPresent('haben', 'hat'), true)
  assert.equal(showPresent('aufstehen', 'steht auf'), true)
})

test('verbParts', () => {
  const gehen = word({ lemma: 'gehen', pos: 'verb', verb: { present3: 'geht', past: 'ging', participle: 'gegangen', auxiliary: ['sein'] } })
  assert.deepEqual(verbParts(gehen), ['ging', 'ist gegangen'])
  const auf = word({ lemma: 'aufstehen', pos: 'verb', verb: { present3: 'steht auf', past: 'stand auf', participle: 'aufgestanden', auxiliary: ['sein', 'haben'] } })
  assert.deepEqual(verbParts(auf), ['steht auf', 'stand auf', 'ist/hat aufgestanden'])
})

test('nounParts', () => {
  assert.deepEqual(nounParts(word({ lemma: 'Haus', pos: 'noun', genders: ['n'], plural: 'Häuser' })), ['das Haus', 'die Häuser'])
  assert.deepEqual(nounParts(word({ lemma: 'Eltern', pos: 'noun', genders: [], pluralOnly: true })), ['die Eltern'])
  assert.deepEqual(nounParts(word({ lemma: 'Alte', pos: 'noun', genders: ['m'], adjForms: ['der Alte', 'ein Alter', 'die Alten'] })), ['der Alte', 'ein Alter', 'die Alten'])
  assert.deepEqual(nounParts(word({ lemma: 'Joghurt', pos: 'noun', genders: ['m', 'n'] })), [])
})

test('checkAnswer: German parts checked, Russian returned', () => {
  const r = checkAnswer('das Haus, die Hauser — дом', ['das Haus', 'die Häuser'])
  assert.deepEqual(r.parts.map(p => p.ok), [true, true])
  assert.equal(r.russian, 'дом')
  const wrong = checkAnswer('der Haus Häuser', ['das Haus', 'die Häuser'])
  assert.deepEqual(wrong.parts.map(p => p.ok), [false, false])
  const verb = checkAnswer('gehen ging ist gegangen', ['gehen', 'ging', 'ist gegangen'])
  assert.deepEqual(verb.parts.map(p => p.ok), [true, true, true])
  assert.deepEqual(checkAnswer('gehen ging gegangen', ['ging', 'ist gegangen']).parts.map(p => p.ok), [true, false])
})

test('checkParts: plural article optional, singular article required', () => {
  const haus = { id: 'x', rank: 0, ru: [], en: [], forms: [], examples: [], lemma: 'Haus', pos: 'noun', genders: ['n'], plural: 'Häuser' } as Parameters<typeof nounParts>[0]
  const parts = checkParts(haus, nounParts(haus))
  assert.deepEqual(parts, ['das Haus', '(die) Häuser'])
  assert.deepEqual(checkAnswer('das Haus Hauser', parts).parts.map(p => p.ok), [true, true])
  assert.deepEqual(checkAnswer('Haus Häuser', parts).parts.map(p => p.ok), [false, true])
})
