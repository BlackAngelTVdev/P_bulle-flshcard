// app/middleware/check_owner_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'

export default class CheckOwnerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { params, auth, response, request, session } = ctx

    if (!auth.user) {
      session.flash('error', 'Vous devez être connecté.')
      return response.redirect().toRoute('auth.login')
    }

    const id = params.id
    const userId = auth.user.id
    const isCardRoute = request.url().includes('/cards')
    let ownerFound = false

    if (id) {
      if (isCardRoute) {
        /* On check si la carte appartient à un deck du user */
        const card = await db
          .from('cards')
          .join('decks', 'cards.deck_id', 'decks.id')
          .where('cards.id', id)
          .where('decks.user_id', userId)
          .first()
        ownerFound = !!card
      } else {
        /* On check si le deck appartient au user */
        const deck = await db.from('decks').where('id', id).where('user_id', userId).first()
        ownerFound = !!deck
      }

      if (!ownerFound) {
        /* Au lieu du forbidden(), on flash et on redirige */
        session.flash('error', "Accès refusé : vous n'êtes pas le propriétaire.")
        return response.redirect().back()
      }
    }

    return next()
  }
}
