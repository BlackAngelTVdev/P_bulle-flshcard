/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const DecksController = () => import('#controllers/decks_controller')

router.get('/', [DecksController, 'index']).as('home')


router.group(() => {
    router.get('/decks', [DecksController, 'index']).as('decks.index')
    router.get('/decks/create', [DecksController, 'create']).as('decks.create')
    router.post('/decks', [DecksController, 'store']).as('decks.store')
    router.get('/decks/:id', [DecksController, 'show']).as('decks.show')
    router.get('/decks/:id/edit', [DecksController, 'edit']).as('decks.edit')
    router.put('/decks/:id', [DecksController, 'update']).as('decks.update')
    router.delete('/decks/:id', [DecksController, 'destroy']).as('decks.destroy')
})