import factory from '@adonisjs/lucid/factories'
import Card from '#models/card'
import { DeckFactory } from './deck_factory.js' // Importe la factory du deck si tu veux lier

export const CardFactory = factory
  .define(Card, ({ faker }) => {
    return {
      question: faker.lorem.sentence(),
      answer: faker.lorem.sentence(),
    }
  })
  // Optionnel : Pour lier automatiquement à un deck
  .relation('deck', () => DeckFactory)
  .build()