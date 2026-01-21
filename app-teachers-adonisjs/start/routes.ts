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
router.get('/teacher/:id/show', [TeachersController, 'show']).as('teacher.show')
router.delete('/teacher/:id/destroy', [TeachersController, 'destroy']).as('teacher.destroy')
router.get('/teacher/add', [TeachersController, 'create']).as('teacher.create')
router.post('/teacher/add', [TeachersController, 'store']).as('teacher.store')