import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DeckFactory } from '#database/factories/deck_factory'
import { CardFactory } from '#database/factories/card_factory'

export default class extends BaseSeeder {
  async run() {
    const decks = await DeckFactory.createMany(5)
    for (const deck of decks) {
      const nbCards = Math.floor(Math.random() * 50) + 50
      
      await CardFactory
        .merge({ deckId: deck.id })
        .createMany(nbCards)
    }


    await CardFactory.merge([
      { deckId: decks[0].id, question: 'Capitale de la France ?', answer: 'Paris' },
      { deckId: decks[0].id, question: 'Vitesse de la lumière ?', answer: '299 792 458 m/s' },
      { deckId: decks[0].id, question: 'Seeder de salopard ?', answer: 'Affirmatif.' }
    ]).createMany(3)
  }
}