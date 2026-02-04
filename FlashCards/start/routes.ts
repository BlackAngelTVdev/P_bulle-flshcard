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
    router.get('/', [DecksController, 'index']).as('decks.index')
    router.get('/create', [DecksController, 'create']).as('decks.create')
    router.post('/', [DecksController, 'store']).as('decks.store')
    router.get('/:id', [DecksController, 'show']).as('decks.show')
    router.get('/:id/edit', [DecksController, 'edit']).as('decks.edit')
    router.put('/:id', [DecksController, 'update']).as('decks.update')
    router.delete('/:id', [DecksController, 'destroy']).as('decks.destroy')
}).prefix('/decks')