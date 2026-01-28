import Deck from '#models/deck'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Write your database queries inside the run method
     await Deck.createMany([
      { name: 'Spanish Basics', description: 'Common Spanish words and phrases' },
      { name: 'French Vocabulary',  description: 'Essential French vocabulary for beginners' },
      { name: 'History Facts', description: 'Important dates and events in history' },
    ])
  }
}