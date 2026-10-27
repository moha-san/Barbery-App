import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filledStars, formatRating, parseRating, ratingCountLabel } from './reviews.ts'

test('parseRating acepta coma o punto y descarta lo raro', () => {
  assert.equal(parseRating('4,9'), 4.9)
  assert.equal(parseRating('4.85'), 4.9)
  assert.equal(parseRating(5), 5)
  assert.equal(parseRating(''), null)
  assert.equal(parseRating('6'), null)
  assert.equal(parseRating('hola'), null)
  assert.equal(parseRating(null), null)
})

test('formatRating usa coma', () => {
  assert.equal(formatRating(4.9), '4,9')
  assert.equal(formatRating(5), '5,0')
})

test('ratingCountLabel en singular y plural', () => {
  assert.equal(ratingCountLabel(1), '1 opinión en Google')
  assert.equal(ratingCountLabel(127), '127 opiniones en Google')
})

test('filledStars redondea', () => {
  assert.equal(filledStars(4.7), 5)
  assert.equal(filledStars(4.2), 4)
})
