/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'

const DecksController = () => import('#controllers/decks_controller')
const CardsController = () => import('#controllers/cards_controller')

// Page d'accueil : redirige vers l'index des decks
router.get('/', [DecksController, 'index']).as('home')

// Routes pour les Decks
router.group(() => {
  router.get('/', [DecksController, 'index']).as('decks.index')
  router.get('/create', [DecksController, 'create']).as('decks.create')
  router.post('/', [DecksController, 'store']).as('decks.store')
  router.get('/:id', [DecksController, 'show']).as('decks.show')
  router.get('/:id/edit', [DecksController, 'edit']).as('decks.edit')
  router.put('/:id', [DecksController, 'update']).as('decks.update')
  router.delete('/:id', [DecksController, 'destroy']).as('decks.destroy')
  router.get('/:id/play', [DecksController, 'play']).as('decks.play')
  router.get('/:id/game', [DecksController, 'game']).as('decks.game')
  router.get('/:id/result', [DecksController, 'result']).as('decks.result')
}).prefix('/decks')

// Routes pour les Cards
router.group(() => {
  router.get('/create', [CardsController, 'create']).as('cards.create')
  router.get('/:id', [CardsController, 'show']).as('cards.show')
  router.post('/', [CardsController, 'store']).as('cards.store')
  router.get('/:id/edit', [CardsController, 'edit']).as('cards.edit')
  router.put('/:id', [CardsController, 'update']).as('cards.update')
  router.delete('/:id', [CardsController, 'destroy']).as('cards.destroy')
}).prefix('/cards')