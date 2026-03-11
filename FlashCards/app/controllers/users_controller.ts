import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { registerValidator } from '#validators/auth'
import { updateProfileValidator, updatePasswordValidator } from '#validators/profile'
import hash from '@adonisjs/core/services/hash'

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
      await session.regenerate()
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
      await session.regenerate()
      await auth.use('web').login(user)
      return response.redirect().toRoute('decks.index')
    } catch (error) {
      session.flashAll()
      return response.redirect().back()
    }
  }

  async showEdit({ view, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    return view.render('pages/auth/profil', { user })
  }

  async updateProfile({ request, auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    try {
      const payload = await request.validateUsing(updateProfileValidator, {
        meta: { userId: user.id },
      })
      user.merge(payload)
      await user.save()
      session.flash('success', 'Profil mis à jour avec succès')
      return response.redirect().toRoute('decks.index')
    } catch (error) {
      session.flash('errors', error.messages ?? 'Une erreur est survenue')
      session.flashAll()
      return response.redirect().toRoute('decks.index')
    }
  }

  async updatePassword({ request, auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    try {
      const { currentPassword, password } = await request.validateUsing(updatePasswordValidator)
      const isValid = await hash.verify(user.password, currentPassword)
      if (!isValid) {
        session.flash('passwordError', 'Mot de passe actuel incorrect')
        session.flashAll()
        return response.redirect().toRoute('decks.index')
      }
      user.password = password
      await user.save()
      session.flash('success', 'Mot de passe mis à jour avec succès')
      return response.redirect().toRoute('decks.index')
    } catch (error) {
      session.flash('passwordError', error.messages ?? 'Une erreur est survenue')
      session.flashAll()
      return response.redirect().toRoute('decks.index')
    }
  }
}