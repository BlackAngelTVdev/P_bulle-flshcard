import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Card from '#models/card'

export default class extends BaseSeeder {
  async run() {
    await Card.createMany([
      // Deck 1 : Les bases
      { deckId: 1, question: 'Capitale de la France ?', answer: 'Paris' },
      { deckId: 1, question: 'Capitale de l\'Espagne ?', answer: 'Madrid' },
      { deckId: 1, question: 'Capitale de l\'Italie ?', answer: 'Rome' },
      
      // Deck 2 : Le deck hardcore (pour tester les textes longs)
      { 
        deckId: 2, 
        question: 'Quelle est la vitesse de la lumière dans le vide ?', 
        answer: '299 792 458 m/s (environ 300 000 km/s)' 
      },
      { 
        deckId: 2, 
        question: 'Qui a écrit "Le Rouge et le Noir" en 1830 ?', 
        answer: 'Stendhal' 
      },

      // Deck 3 : Le deck pour le debug
      { 
        deckId: 3, 
        question: 'Est-ce que ce seeder est de salopard ?', 
        answer: 'Affirmatif, tout est prêt pour tester.' 
      },
      { 
        deckId: 3, 
        question: 'Test de question très très longue pour voir si ton CSS de deck-card explose ou si ça reste propre ?', 
        answer: 'Normalement ça tient si tu as mis un overflow ou un wrap.' 
      },
      { 
        deckId: 3, 
        question: 'Test de question très très longue pour voir si ton CSS de deck-card explose ou si ça reste propre ?', 
        answer: 'Normalement ça tient si tu as mis un overflow ou un wrap.' 
      },
      { 
        deckId: 3, 
        question: 'Test de question très très longue pour voir si ton CSS de deck-card explose ou si ça reste propre ?', 
        answer: 'Normalement ça tient si tu as mis un overflow ou un wrap.' 
      },
      { 
        deckId: 3, 
        question: 'Test de question très très longue pour voir si ton CSS de deck-card explose ou si ça reste propre ?', 
        answer: 'Normalement ça tient si tu as mis un overflow ou un wrap.' 
      },
      { 
        deckId: 3, 
        question: 'Test de question très très longue pour voir si ton CSS de deck-card explose ou si ça reste propre ?', 
        answer: 'Normalement ça tient si tu as mis un overflow ou un wrap.' 
      }
    ])
  }
}