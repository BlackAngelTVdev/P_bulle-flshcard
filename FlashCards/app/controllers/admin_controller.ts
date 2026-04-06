import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import GameSession from '#models/game_session'
import { DateTime } from 'luxon'

export default class AdminController {
  private async getConnectedUsers() {
    const onlineSince = DateTime.now().minus({ minutes: 2 }).toJSDate()

    return db
      .from('users')
      .select('id', 'username', 'email', 'is_admin', 'last_seen_at')
      .whereNotNull('last_seen_at')
      .where('last_seen_at', '>=', onlineSince)
      .orderBy('last_seen_at', 'desc')
      .limit(200)
  }

  async index({ view }: HttpContext) {
    const usersRow = await db.from('users').count('* as total').first()
    const adminsRow = await db.from('users').where('is_admin', true).count('* as total').first()

    const decksRow = await db.from('decks').count('* as total').first()
    const cardsRow = await db.from('cards').count('* as total').first()
    const connectedUsers = await this.getConnectedUsers()

    const users = await db
      .from('users')
      .select('id', 'username', 'email', 'is_admin', 'created_at')
      .orderBy('created_at', 'desc')

    const stats = {
      users: Number(usersRow?.total || 0),
      admins: Number(adminsRow?.total || 0),
      decks: Number(decksRow?.total || 0),
      cards: Number(cardsRow?.total || 0),
      connectedUsers: connectedUsers.length,
    }

    return view.render('pages/admin/index', {
      stats,
      users,
      connectedUsers,
    })
  }

  async connectedUsers({ auth, response }: HttpContext) {
    const connectedUsers = await this.getConnectedUsers()
    const currentUserId = auth.user?.id

    return response.ok({
      connectedUsers: connectedUsers.map((row) => ({
        ...row,
        is_current_user: currentUserId === Number(row.id),
      })),
      count: connectedUsers.length,
    })
  }

  async disconnectConnectedUser({ params, auth, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const targetUserId = Number(params.id)

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return response.badRequest({ message: 'Utilisateur invalide.' })
    }

    if (admin.id === targetUserId) {
      return response.badRequest({ message: 'Tu ne peux pas te deconnecter toi-meme.' })
    }

    const targetUser = await User.find(targetUserId)
    if (!targetUser) {
      return response.notFound({ message: 'Utilisateur introuvable.' })
    }

    targetUser.sessionVersion = Number(targetUser.sessionVersion || 0) + 1
    targetUser.lastSeenAt = null
    await targetUser.save()

    await db.from('remember_me_tokens').where('tokenable_id', targetUserId).delete()

    return response.ok({ message: 'Utilisateur deconnecte en temps reel.' })
  }

  async destroyGameSession({ params, response, session }: HttpContext) {
    const sessionId = Number(params.id)

    const deletedRows = await GameSession.query().where('id', sessionId).delete()

    if (!deletedRows) {
      session.flash('error', 'Session de jeu introuvable.')
      return response.redirect().back()
    }

    session.flash('success', 'Session de jeu résiliée.')
    return response.redirect().back()
  }

  async destroyUser({ params, auth, response, session }: HttpContext) {
    const admin = auth.getUserOrFail()
    const targetUserId = Number(params.id)

    if (admin.id === targetUserId) {
      session.flash('error', 'Tu ne peux pas résilier ton propre compte admin.')
      return response.redirect().back()
    }

    const targetUser = await User.find(targetUserId)
    if (!targetUser) {
      session.flash('error', 'Compte introuvable.')
      return response.redirect().back()
    }

    if (targetUser.isAdmin) {
      const adminsCountRow = await db
        .from('users')
        .where('is_admin', true)
        .count('* as total')
        .first()

      const adminsCount = Number(adminsCountRow?.total || 0)
      if (adminsCount <= 1) {
        session.flash('error', 'Impossible de supprimer le dernier compte admin.')
        return response.redirect().back()
      }
    }

    await db.from('remember_me_tokens').where('tokenable_id', targetUser.id).delete()

    await targetUser.delete()
    session.flash('success', 'Compte résilié avec succès.')
    return response.redirect().back()
  }
}
