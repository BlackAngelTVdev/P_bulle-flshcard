import factory from '@adonisjs/lucid/factories'
import Deck from '#models/deck'
import { CardFactory } from './card_factory.js'

export const DeckFactory = factory
  .define(Deck, ({ faker }) => {
    return {
      name: faker.commerce.productName(),
      description: faker.lorem.sentence(),
    }
  })
  // Cette ligne permet de faire : DeckFactory.with('cards', 5)
  .relation('cards', () => CardFactory)
  .build()
