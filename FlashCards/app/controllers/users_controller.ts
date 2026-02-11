import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { registerValidator, loginValidator } from '#validators/auth'

export default class AuthController {

    async showLogin({ view }: HttpContext) {
        console.log('[AUTH] Affichage de la page de login')
        return view.render('pages/auth/login')
    }

    async login({ request, auth, response, session }: HttpContext) {
        console.log('[AUTH] Tentative de connexion reçue...')
        const data = request.all()
        console.log(`[AUTH] Email fourni: ${data.email}`)

        try {
            // 1. Validation des champs
            const payload = await request.validateUsing(loginValidator)
            console.log('[AUTH] ✅ Validation VineJS réussie')

            // 2. Vérification des identifiants
            const user = await User.verifyCredentials(payload.email, payload.password)
            console.log(`[AUTH] 👤 Utilisateur trouvé: ${user.username} (ID: ${user.id})`)

            // 3. Création de la session
            await auth.use('web').login(user)
            console.log('[AUTH] 🚀 Session créée, redirection vers /decks')

            return response.redirect().toRoute('decks.index')

        } catch (error) {
            console.error('[AUTH] ❌ Échec de la connexion')

            // Si l'erreur vient de la validation (VineJS)
            if (error.messages) {
                console.log('[AUTH] Erreurs de validation:', error.messages)
            } else {
                console.log('[AUTH] Cause probable: Mauvais mot de passe ou email inconnu')
            }

            session.flash('errors', 'Identifiants invalides')
            return response.redirect().back()
        }
    }

    async logout({ auth, response }: HttpContext) {
        await auth.use('web').logout()
        return response.redirect().toRoute('auth.login')
    }




    // Ajoute ça dans ton AuthController existant
    async showRegister({ view }: HttpContext) {
        console.log('[AUTH] Affichage page inscription')
        return view.render('pages/auth/register')
    }

    async register({ request, auth, response, session }: HttpContext) {
        console.log('[AUTH] Tentative d\'inscription...')

        try {
            // 1. Validation via le validateur qu'on a fait (8 caractères min, unique, etc.)
            const payload = await request.validateUsing(registerValidator)
            console.log('[AUTH] ✅ Validation réussie pour:', payload.username)

            // 2. Création du user
            const user = await User.create(payload)
            console.log('[AUTH] ✨ Utilisateur créé avec l\'ID:', user.id)

            // 3. Login auto
            await auth.use('web').login(user)
            console.log('[AUTH] 🚀 Connecté automatiquement, redirection...')

            return response.redirect().toRoute('decks.index')

        } catch (error) {
            console.error('[AUTH] ❌ Erreur d\'inscription')
            if (error.messages) {
                console.log('[AUTH] Détails:', error.messages)
            }

            session.flashAll() // Garde les champs remplis pour pas que l'user doive tout retaper
            return response.redirect().back()
        }
    }
}