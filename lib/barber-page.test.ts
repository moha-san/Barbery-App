import { test } from 'node:test'
import assert from 'node:assert/strict'
import { instagramHandle, slugify, uniqueSlug } from './barber-page.ts'

test('slugify quita tildes y espacios', () => {
  assert.equal(slugify('José Luis Núñez'), 'jose-luis-nunez')
  assert.equal(slugify('  El Moha! '), 'el-moha')
})

test('uniqueSlug añade número si ya existe', () => {
  assert.equal(uniqueSlug('carlos', []), 'carlos')
  assert.equal(uniqueSlug('carlos', ['carlos', 'carlos-2']), 'carlos-3')
  assert.equal(uniqueSlug('', []), 'barbero')
})

test('instagramHandle acepta @, nombre o enlace', () => {
  assert.equal(instagramHandle('@carlos.barber'), 'carlos.barber')
  assert.equal(instagramHandle('https://www.instagram.com/carlos_cuts/?hl=es'), 'carlos_cuts')
  assert.equal(instagramHandle('carlos'), 'carlos')
  assert.equal(instagramHandle('no vale con espacios'), null)
  assert.equal(instagramHandle(''), null)
})
