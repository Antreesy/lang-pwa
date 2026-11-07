import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDecks, groupsOf, isStrongVerb, mainHypernyms } from './decks.mjs'

test('isStrongVerb: past is not stem + te', () => {
  const v = past => ({ past })
  assert.equal(isStrongVerb('machen', v('machte')), false)
  assert.equal(isStrongVerb('arbeiten', v('arbeitete')), false)
  assert.equal(isStrongVerb('lächeln', v('lächelte')), false)
  assert.equal(isStrongVerb('aufmachen', v('machte auf')), false)
  assert.equal(isStrongVerb('gehen', v('ging')), true)
  assert.equal(isStrongVerb('aufstehen', v('stand auf')), true)
  assert.equal(isStrongVerb('bringen', v('brachte')), true) // mixed verb
  assert.equal(isStrongVerb('haben', v('hatte')), true)
  assert.equal(isStrongVerb('x', v(null)), false)
})

test('mainHypernyms: only sense 1', () => {
  const raw = { hypernyms: [{ word: 'Gebäude', sense_index: '1, 2' }, { word: 'Ort', sense_index: '1–3' }, { word: 'Gruppe', sense_index: '4–7' }, { word: 'Bau', sense_index: '10' }, { word: 'X' }] }
  assert.deepEqual(mainHypernyms(raw), ['Gebäude', 'Ort', 'X'])
})

test('groupsOf: grammar and topic keys', () => {
  const verb = { lemma: 'aufstehen', pos: 'verb', verb: { present3: 'steht auf', past: 'stand auf', auxiliary: ['sein'] } }
  assert.deepEqual(groupsOf(verb, {}), ['grammar:verb-strong', 'grammar:verb-separable', 'grammar:verb-sein'])
  const noun = { lemma: 'Apfel', pos: 'noun', genders: ['m'] }
  assert.deepEqual(groupsOf(noun, { hypernyms: [{ word: 'Obst', sense_index: '1' }, { word: 'Frucht', sense_index: '1' }] }), ['grammar:noun-m', 'topic:food'])
  const eltern = { lemma: 'Eltern', pos: 'noun', genders: [] }
  assert.deepEqual(groupsOf(eltern, { categories: [{ name: 'Pluraletantum (Deutsch)' }] }), ['grammar:noun-plural-only'])
})

test('buildDecks: equal parts, rank order, small groups dropped', () => {
  const words = Array.from({ length: 120 }, (_, i) => ({ id: `w${i}`, lemma: `L${i}` }))
  const groups = new Map(words.map((w, i) => [w.id, i < 5 ? ['topic:colors', 'topic:food'] : ['topic:food']]))
  const decks = buildDecks(words, groups)
  assert.deepEqual(decks.map(d => [d.id, d.part, d.words.length]), [['topic:food:1', 1, 40], ['topic:food:2', 2, 40], ['topic:food:3', 3, 40]])
  assert.equal(decks[0].words[0], 'w0')
  assert.equal(decks[0].name, 'Еда и напитки')
})

test('buildDecks: a homonym goes into a deck once', () => {
  const words = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, lemma: i < 2 ? 'Mutter' : `L${i}` }))
  const decks = buildDecks(words, new Map(words.map(w => [w.id, ['topic:family']])))
  assert.deepEqual(decks[0].words, ['w0', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9'])
})
