// app/middleware/check_owner_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'

export default class CheckOwnerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { params, auth, response, request } = ctx
    
    // 1. Vérification de sécurité : l'utilisateur est-il loggé ?
    if (!auth.user) {
      return response.unauthorized('Vous devez être connecté.')
    }

    const id = params.id
    const userId = auth.user.id // Maintenant c'est safe

    const isCardRoute = request.url().includes('/cards')
    let ownerFound = false

    if (id) {
      if (isCardRoute) {
        const card = await db.from('cards')
          .join('decks', 'cards.deck_id', 'decks.id')
          .where('cards.id', id)
          .where('decks.user_id', userId)
          .first()
        ownerFound = !!card
      } else {
        const deck = await db.from('decks')
          .where('id', id)
          .where('user_id', userId)
          .first()
        ownerFound = !!deck
      }

      if (!ownerFound) {
        return response.forbidden('Accès refusé : vous n\'êtes pas le propriétaire.')
      }
    }

    return next()
  }
}