/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import TeachersController from '#controllers/teachers_controller'
import router from '@adonisjs/core/services/router'

router.get('/', [TeachersController, 'index']).as('home')
