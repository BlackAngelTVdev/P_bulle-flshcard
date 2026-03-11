import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { registerValidator } from '#validators/auth'
import { updateProfileValidator, updatePasswordValidator } from '#validators/profile'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  // ─── Pages d'authentification ───────────────────────────────────────────────

  /**
   * Affiche la page de connexion.
   * Si l'utilisateur est déjà connecté, on le redirige vers l'index des decks.
   */
  async showLogin({ view, auth, response }: HttpContext) {
    if (await auth.use('web').check()) {
      return response.redirect().toRoute('decks.index')
    }
    return view.render('pages/auth/login')
  }

  /**
   * Affiche la page d'inscription.
   * Redirige vers les decks si l'utilisateur est déjà authentifié.
   */
  async showRegister({ view, auth, response }: HttpContext) {
    if (await auth.use('web').check()) {
      return response.redirect().toRoute('decks.index')
    }
    return view.render('pages/auth/register')
  }

  /**
   * Affiche la page de modification du profil.
   * Récupère l'utilisateur connecté via auth.getUserOrFail().
   */
  async showEdit({ view, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    return view.render('pages/auth/profil', { user })
  }

  // ─── Actions d'authentification ─────────────────────────────────────────────

  /**
   * Traite la tentative de connexion.
   * Gère l'UID (email ou username), le mot de passe et le "Se souvenir de moi".
   */
  async login({ request, auth, response, session }: HttpContext) {
    const uid = request.input('uid')
    const password = request.input('password')
    const isRememberMe = request.input('isRememberMe') === 'on'

    try {
      // On cherche l'utilisateur soit par son email, soit par son username
      const user = await User.query()
        .where('email', uid)
        .orWhere('username', uid)
        .firstOrFail()

      // Vérification manuelle du hash du mot de passe
      const isValid = await hash.verify(user.password, password)
      if (!isValid) throw new Error('Invalid credentials')

      // Régénération de la session pour éviter les fixations de session
      await session.regenerate()
      // Connexion de l'utilisateur avec le driver web
      await auth.use('web').login(user, isRememberMe)

      return response.redirect().toRoute('decks.index')
    } catch {
      // En cas d'erreur (user non trouvé ou mdp faux), on flash un message
      session.flash('errors', 'Identifiants invalides')
      return response.redirect().back()
    }
  }

  /**
   * Traite l'inscription d'un nouvel utilisateur.
   * Utilise registerValidator pour valider les données entrantes.
   */
  async register({ request, auth, response, session }: HttpContext) {
    try {
      // Validation du payload via le validator VineJS
      const payload = await request.validateUsing(registerValidator)
      // Création du user en base de données
      const user = await User.create(payload)

      await session.regenerate()
      // Connexion automatique après inscription
      await auth.use('web').login(user, true)

      return response.redirect().toRoute('decks.index')
    } catch (error) {
      // Capture les messages d'erreur de validation pour les afficher en front
      session.flash('errors', error.messages ?? 'Une erreur est survenue')
      return response.redirect().back()
    }
  }

  /**
   * Déconnexion de l'utilisateur.
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toRoute('auth.login')
  }

  // ─── Actions de Profil ──────────────────────────────────────────────────────

  /**
   * Met à jour les infos de base (username, email).
   * Passe l'ID de l'utilisateur au validator pour les règles d'unicité (unique).
   */
  async updateProfile({ request, auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const payload = await request.validateUsing(updateProfileValidator, {
        meta: { userId: user.id },
      })

      // Fusion des nouvelles données et sauvegarde
      user.merge(payload)
      await user.save()

      session.flash('success', 'Profil mis à jour avec succès')
    } catch (error) {
      session.flash('errors', error.messages ?? 'Une erreur est survenue')
    }

    return response.redirect().toRoute('profile.edit')
  }

  /**
   * Met à jour le mot de passe après avoir vérifié l'ancien.
   */
  async updatePassword({ request, auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const { currentPassword, password } = await request.validateUsing(updatePasswordValidator)

      // On vérifie que le mot de passe actuel fourni correspond à celui en base
      const isValid = await hash.verify(user.password, currentPassword)
      if (!isValid) {
        session.flash('passwordError', 'Mot de passe actuel incorrect')
        return response.redirect().toRoute('profile.edit')
      }

      // Le setter du modèle User hash automatiquement le nouveau mot de passe
      user.password = password
      await user.save()

      session.flash('success', 'Mot de passe mis à jour avec succès')
    } catch (error) {
      session.flash('passwordError', error.messages ?? 'Une erreur est survenue')
    }

    return response.redirect().toRoute('profile.edit')
  }
}