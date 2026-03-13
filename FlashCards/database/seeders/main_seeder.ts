import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DeckFactory } from '#database/factories/deck_factory'
import { CardFactory } from '#database/factories/card_factory'
import Card from '#models/card'
import User from '#models/user' // Import indispensable

export default class extends BaseSeeder {
  async run() {
    // 1. D'ABORD : Créer ou trouver l'user 1 (sinon les decks vont crash)
    const user = await User.firstOrCreate(
      { id: 1 }, 
      { 
        username: 'DamienDev',
        email: 'damien@etml.ch',
        password: 'password123' 
      }
    )

    // 2. ENSUITE : Créer les decks liés à cet user
    // On utilise .merge({ userId: user.id }) pour chaque deck
    const decks = await DeckFactory
      .merge({ userId: user.id }) 
      .createMany(5)

    for (const deck of decks) {
      const nbCards = Math.floor(Math.random() * 50) + 50
      
      await CardFactory
        .merge({ deckId: deck.id }) // Ici, on lie la carte au deck (le deck sait déjà à quel user il appartient)
        .createMany(nbCards)
    }

    // 3. Tes cartes spécifiques
    await Card.createMany([
      { deckId: decks[0].id, question: 'Capitale de la France ?', answer: 'Paris' },
      { deckId: decks[0].id, question: 'Vitesse de la lumière ?', answer: '299 792 458 m/s' },
      { deckId: decks[0].id, question: 'Seeder de salopard ?', answer: 'Affirmatif.' }
    ])
  }
}