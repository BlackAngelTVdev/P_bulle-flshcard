import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import GameSession from '#models/game_session'

export default class AdminController {
  async index({ view }: HttpContext) {
    const usersRow = await db.from('users').count('* as total').first()
    const adminsRow = await db.from('users').where('is_admin', true).count('* as total').first()

    const decksRow = await db.from('decks').count('* as total').first()
    const cardsRow = await db.from('cards').count('* as total').first()
    const gameSessionsRow = await db.from('game_sessions').count('* as total').first()
    const loginSessionsRow = await db.from('remember_me_tokens').count('* as total').first()

    const users = await db
      .from('users')
      .select('id', 'username', 'email', 'is_admin', 'created_at')
      .orderBy('created_at', 'desc')

    const gameSessions = await db
      .from('game_sessions')
      .leftJoin('users', 'users.id', 'game_sessions.user_id')
      .leftJoin('decks', 'decks.id', 'game_sessions.deck_id')
      .select(
        'game_sessions.id',
        'game_sessions.user_id',
        'game_sessions.deck_id',
        'game_sessions.mode',
        'game_sessions.total_cards',
        'game_sessions.correct_answers',
        'game_sessions.ended_at',
        'users.username as username',
        'decks.name as deck_name'
      )
      .orderBy('game_sessions.created_at', 'desc')
      .limit(100)

    const loginSessions = await db
      .from('remember_me_tokens')
      .leftJoin('users', 'users.id', 'remember_me_tokens.tokenable_id')
      .select(
        'remember_me_tokens.id',
        'remember_me_tokens.tokenable_id',
        'remember_me_tokens.created_at',
        'remember_me_tokens.expires_at',
        'users.username as username',
        'users.email as email'
      )
      .orderBy('remember_me_tokens.created_at', 'desc')
      .limit(100)

    const stats = {
      users: Number(usersRow?.total || 0),
      admins: Number(adminsRow?.total || 0),
      decks: Number(decksRow?.total || 0),
      cards: Number(cardsRow?.total || 0),
      gameSessions: Number(gameSessionsRow?.total || 0),
      loginSessions: Number(loginSessionsRow?.total || 0),
    }

    return view.render('pages/admin/index', {
      stats,
      users,
      gameSessions,
      loginSessions,
    })
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

  async destroyLoginSession({ params, response, session }: HttpContext) {
    const tokenId = Number(params.id)

    const deletedRows = await db.from('remember_me_tokens').where('id', tokenId).delete()

    if (!deletedRows) {
      session.flash('error', 'Session de connexion introuvable.')
      return response.redirect().back()
    }

    session.flash('success', 'Session de connexion résiliée.')
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

    await targetUser.delete()
    session.flash('success', 'Compte résilié avec succès.')
    return response.redirect().back()
  }
}
