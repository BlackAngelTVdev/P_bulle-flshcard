import Card from '#models/card'
import type { HttpContext } from '@adonisjs/core/http'

export default class CardsController {
        async create({ view }: HttpContext) {
                return view.render('pages/cards/create')
        }
        async store({ request, response }: HttpContext) {
                // Logique pour stocker une nouvelle carte
                return response.redirect().toRoute('decks.index')
        }
        async show({ params, view }: HttpContext) {
                const card = await Card.findOrFail(params.id)
                return view.render('pages/cards/show', { card })
        }
 
        async edit({ params, view }: HttpContext) {
                const card = await Card.findOrFail(params.id)
                return view.render('pages/cards/edit', { card })
        }

        // Traite la modification
        async update({ params, request, response, session }: HttpContext) {
                const card = await Card.findOrFail(params.id)

                const payload = await request.validateUsing(updateCardValidator)

                card.merge(payload)
                await card.save()

                session.flash('success', 'La carte a été mise à jour !')
                // On redirige vers le deck pour voir le tableau des cartes
                return response.redirect().toRoute('decks.show', { id: card.deckId })
        }


        async destroy({ params, response }: HttpContext) {
        // Logique pour supprimer une carte
        return response.redirect().toRoute('decks.index')
}

}