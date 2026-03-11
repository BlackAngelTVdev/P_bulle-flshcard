import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { registerValidator } from '#validators/auth'
import { updateProfileValidator, updatePasswordValidator } from '#validators/profile'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  async showLogin({ view, auth, response }: HttpContext) {
    if (await auth.use('web').check()) {
      return response.redirect().toRoute('decks.index')
    }
    return view.render('pages/auth/login')
  }

  async login({ request, auth, response, session }: HttpContext) {
    const uid = request.input('uid')
    const password = request.input('password')
    const isRememberMe = request.input('isRememberMe') === 'on'

    try {
      const user = await User.query()
        .where('email', uid)
        .orWhere('username', uid)
        .firstOrFail()

      const isValid = await hash.verify(user.password, password)
      if (!isValid) throw new Error('Invalid credentials')

      await session.regenerate()
      await auth.use('web').login(user, isRememberMe)

      return response.redirect().toRoute('decks.index')
    } catch (error) {
      session.flash('errors', 'Identifiants invalides')
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
      await auth.use('web').login(user, true)

      return response.redirect().toRoute('decks.index')
    } catch (error) {
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
      return response.redirect().toRoute('auth.showEdit')
    } catch (error) {
      session.flash('errors', error.messages ?? 'Une erreur est survenue')
      session.flashAll()
      return response.redirect().toRoute('auth.showEdit')
    }
  }

  async updatePassword({ request, auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    try {
      const { currentPassword, password } = await request.validateUsing(updatePasswordValidator)

      const isValid = await hash.verify(user.password, currentPassword)
      if (!isValid) {
        session.flash('passwordError', 'Mot de passe actuel incorrect')
        return response.redirect().toRoute('auth.showEdit')
      }

      user.password = password
      await user.save()

      session.flash('success', 'Mot de passe mis à jour avec succès')
      return response.redirect().toRoute('auth.showEdit')
    } catch (error) {
      session.flash('passwordError', error.messages ?? 'Une erreur est survenue')
      return response.redirect().toRoute('auth.showEdit')
    }
  }
}