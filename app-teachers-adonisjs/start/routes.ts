/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/


import router from '@adonisjs/core/services/router'
import TeachersController from '#controllers/teachers_controller'
import SectionsController from '#controllers/sections_controller'


router.get('/', [TeachersController, 'index']).as('home')
router.get('/teacher/:id/show', [TeachersController, 'show']).as('teacher.show')
router.delete('/teacher/:id/destroy', [TeachersController, 'destroy']).as('teacher.destroy')
router.get('/teacher/add', [TeachersController, 'create']).as('teacher.create')
router.post('/teacher/add', [TeachersController, 'store']).as('teacher.store')
router.get('/teacher/:id/edit', [TeachersController, 'edit']).as('teacher.edit')
router.put('/teacher/:id/update', [TeachersController,'update']).as('teacher.update')
router.get('/sections', [SectionsController, 'index']).as('sections.index')
router.get('/section/add', [SectionsController, 'create']).as('sections.create')
router.post('/section/add', [SectionsController, 'store']).as('sections.store')
router.delete('/section/:id/destroy', [SectionsController, 'destroy']).as('sections.destroy')