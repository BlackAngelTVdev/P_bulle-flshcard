import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel' // Import nécessaire pour protéger les routes

const DecksController = () => import('#controllers/decks_controller')
const CardsController = () => import('#controllers/cards_controller')
const AuthController = () => import('#controllers/users_controller')

// --- ROUTES PUBLIQUES (Accessibles sans compte) ---
router.get('/', ({ response }) => response.redirect().toRoute('auth.login'))

router.group(() => {
  router.get('/login', [AuthController, 'showLogin']).as('auth.login')
  router.post('/login', [AuthController, 'login']).as('auth.handleLogin')
  router.get('/register', [AuthController, 'showRegister']).as('auth.register')
  router.post('/register', [AuthController, 'register']).as('auth.handleRegister')
}).prefix('/auth')


// --- ROUTES PROTÉGÉES (Connexion requise) ---
router.group(() => {
  
  // Logout
  router.get('/logout', [AuthController, 'logout']).as('auth.logout')

  // Group Decks
  router.group(() => {
    router.get('/', [DecksController, 'index']).as('decks.index')
    router.get('/mine', [DecksController, 'myDecks']).as('decks.mine')
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

  // Group Cards
  router.group(() => {
    router.get('/create', [CardsController, 'create']).as('cards.create')
    router.get('/:id', [CardsController, 'show']).as('cards.show')
    router.post('/', [CardsController, 'store']).as('cards.store')
    router.get('/:id/edit', [CardsController, 'edit']).as('cards.edit')
    router.put('/:id', [CardsController, 'update']).as('cards.update')
    router.delete('/:id', [CardsController, 'destroy']).as('cards.destroy')
  }).prefix('/cards')

}).use(middleware.auth())