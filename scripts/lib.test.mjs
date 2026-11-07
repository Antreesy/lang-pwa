import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compactEntry, tokenize } from './lib.mjs'

test('tokenize keeps case and adds lower-case first word', () => {
  assert.deepEqual(tokenize('Essen wir das Essen?'), ['Essen', 'wir', 'das', 'Essen', 'essen'])
  assert.deepEqual(tokenize('Er ist E-Mail-süchtig.'), ['Er', 'ist', 'E-Mail-süchtig', 'er'])
})

test('noun: gender, plural, forms, unique translations', () => {
  const e = compactEntry({
    word: 'Haus', pos: 'noun', lang_code: 'de', tags: ['neuter'], senses: [{ glosses: ['Gebäude'] }],
    forms: [
      { form: 'Häuschen', tags: ['diminutive'] },
      { form: 'Häuser', tags: ['nominative', 'plural'] },
      { form: 'Hauses', tags: ['genitive', 'singular'] },
    ],
    translations: [
      { lang_code: 'ru', word: 'дом', sense_index: '1' },
      { lang_code: 'ru', word: 'дом', sense_index: '2' },
      { lang_code: 'en', word: 'house', sense_index: '1' },
    ],
  })
  assert.deepEqual(e, { lemma: 'Haus', pos: 'noun', ru: ['дом'], en: ['house'], forms: ['Haus', 'Häuser', 'Hauses'], genders: ['n'], plural: 'Häuser' })
})

test('verb: main forms, only haben/sein as auxiliary, no multi-word forms', () => {
  const e = compactEntry({
    word: 'gehen', pos: 'verb', lang_code: 'de', senses: [{ glosses: ['x'] }],
    forms: [
      { form: 'geht', tags: ['present'], pronouns: ['er', 'sie', 'es'] },
      { form: 'ging', tags: ['past'], pronouns: ['ich'] },
      { form: 'geh!', tags: ['imperative', 'singular'] },
      { form: 'gegangen', tags: ['participle-2', 'perfect'] },
      { form: 'sein', tags: ['auxiliary', 'perfect'] },
      { form: 'gegangen sein', tags: ['auxiliary', 'infinitive', 'perfect'] },
    ],
    translations: [{ lang_code: 'ru', word: 'идти' }],
  })
  assert.deepEqual(e.verb, { present3: 'geht', past: 'ging', participle: 'gegangen', auxiliary: ['sein'] })
  assert.deepEqual(e.forms, ['gehen', 'geht', 'ging', 'geh', 'gegangen'])
})

test('skip form-of pages, names and entries without translations', () => {
  const base = { lang_code: 'de', translations: [{ lang_code: 'en', word: 'x' }] }
  assert.equal(compactEntry({ ...base, word: 'ging', pos: 'verb', senses: [{ form_of: [{ word: 'gehen' }] }] }), null)
  assert.equal(compactEntry({ ...base, word: 'Berlin', pos: 'name', senses: [{}] }), null)
  assert.equal(compactEntry({ ...base, word: 'Haus', pos: 'noun', senses: [{}], translations: [] }), null)
})
