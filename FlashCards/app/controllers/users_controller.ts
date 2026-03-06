import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { registerValidator } from '#validators/auth'

export default class AuthController {
  async showLogin({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }

  async login({ request, auth, response, session }: HttpContext) {
    const { uid, password } = request.all()
    try {
      const user = await User.query()
        .where('email', uid)
        .orWhere('username', uid)
        .first()

      if (!user) {
        throw new Error('Invalid credentials')
      }

      await User.verifyCredentials(user.email, password)

      await session.regenerate() // ← AJOUT ICI
      await auth.use('web').login(user)

      return response.redirect().toRoute('decks.index')
    } catch (error) {
      session.flash('errors', 'Identifiants invalides')
      session.flashAll()
      return response.redirect().back()
    }
  }

  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toRoute('auth.login')
  }

  async showRegister({ view }: HttpContext) {
    return view.render('pages/auth/register')
  }

  async register({ request, auth, response, session }: HttpContext) {
    try {
      const payload = await request.validateUsing(registerValidator)
      const user = await User.create(payload)

      await session.regenerate() // ← AJOUT ICI
      await auth.use('web').login(user)

      return response.redirect().toRoute('decks.index')
    } catch (error) {
      session.flashAll()
      return response.redirect().back()
    }
  }
}