import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import HomeController from '#controllers/home_controller'

const DecksController = () => import('#controllers/decks_controller')
const CardsController = () => import('#controllers/cards_controller')
const AuthController = () => import('#controllers/users_controller')

// Routes redirection
router.get('/', [HomeController, 'index']).as('index')

router.get('/legal/:face', ({ params, view }) => {
  const face = ['cgu', 'data'].includes(params.face) ? params.face : 'cgu'
  return view.render('pages/conditions/legal', { face })
}).as('legal')
router.get('/legal', ({ response }) => {
  return response.redirect().toRoute('legal', { face: 'cgu' })
}).as('legal.index')

// Auth
router.group(() => {
  router.get('/login', [AuthController, 'showLogin']).as('auth.login')
  router.post('/login', [AuthController, 'login']).as('auth.handleLogin')
  router.get('/register', [AuthController, 'showRegister']).as('auth.register')
  router.post('/register', [AuthController, 'register']).as('auth.handleRegister')
}).prefix('/auth')

// Routes protégées
router.group(() => {
  router.get('/logout', [AuthController, 'logout']).as('auth.logout')


  // Section Decks
  router.group(() => {
    // Consultation et Jeu (Ouvert à tous les connectés)
    router.get('/', [DecksController, 'index']).as('decks.index')
    router.get('/mine', [DecksController, 'myDecks']).as('decks.mine')
    router.get('/create', [DecksController, 'create']).as('decks.create')
    router.post('/', [DecksController, 'store']).as('decks.store')
    router.get('/:id', [DecksController, 'show']).as('decks.show')

    // Tes routes de jeu remises ici :
    router.get('/:id/play', [DecksController, 'play']).as('decks.play')
    router.get('/:id/game', [DecksController, 'game']).as('decks.game')
    router.get('/:id/result', [DecksController, 'result']).as('decks.result')

    // Modification (🛡️ Uniquement le proprio)
    router.group(() => {
      router.get('/:id/edit', [DecksController, 'edit']).as('decks.edit')
      router.put('/:id', [DecksController, 'update']).as('decks.update')
      router.delete('/:id', [DecksController, 'destroy']).as('decks.destroy')
    }).use(middleware.isOwner())

  }).prefix('/decks')

  // Section Cards
  router.group(() => {
    router.get('/create', [CardsController, 'create']).as('cards.create')
    router.post('/', [CardsController, 'store']).as('cards.store')
    router.get('/:id', [CardsController, 'show']).as('cards.show')

    // Modification (Middleware de propriété)
    router.group(() => {
      router.get('/:id/edit', [CardsController, 'edit']).as('cards.edit')
      router.put('/:id', [CardsController, 'update']).as('cards.update')
      router.delete('/:id', [CardsController, 'destroy']).as('cards.destroy')
    }).use(middleware.isOwner())
  }).prefix('/cards')

}).use(middleware.auth())

router.any('*', ({ view }) => {
  return view.render('pages/errors/not_found')
}).as('not_found')
