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

router.get('/', [DecksController, 'index'])
