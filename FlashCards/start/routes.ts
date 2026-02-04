/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'

// On utilise le lazy loading pour les contrôleurs (plus performant)
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
}).prefix('/decks')

// Routes pour les Cards
router.group(() => {
  router.get('/', [CardsController, 'index']).as('cards.index')
  router.get('/create', [CardsController, 'create']).as('cards.create')
  router.post('/', [CardsController, 'store']).as('cards.store')
  router.get('/:id', [CardsController, 'show']).as('cards.show')
  router.get('/:id/edit', [CardsController, 'edit']).as('cards.edit')
  router.put('/:id', [CardsController, 'update']).as('cards.update')
  router.delete('/:id', [CardsController, 'destroy']).as('cards.destroy')
}).prefix('/cards')