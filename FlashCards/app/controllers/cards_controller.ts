import Card from '#models/card'
import type { HttpContext } from '@adonisjs/core/http'
import { createCardValidator, updateCardValidator } from '#validators/card'
import Deck from '#models/deck'
export default class CardsController {
        async create({ view }: HttpContext) {
                return view.render('pages/cards/create')
        }
        async store({ request, auth, response, session }: HttpContext) {
                const payload = await request.validateUsing(createCardValidator)

                // Vérification que le deck appartient bien à l'utilisateur connecté
                const deck = await Deck.query()
                        .where('id', payload.deckId)
                        .where('userId', auth.user!.id)
                        .first()

                if (!deck) {
                        session.flash('error', 'Accès refusé. Ce deck ne vous appartient pas.')
                        return response.redirect().toRoute('decks.index')
                }

                await Card.create(payload)
                session.flash('success', 'Carte créée.')
                return response.redirect().toRoute('decks.show', { id: payload.deckId })
        }
        async show({ params, view }: HttpContext) {
                const card = await Card.query()
                        .where('id', params.id)
                        .preload('deck')
                        .firstOrFail()

                return view.render('pages/cards/show', { card })
        }

        async edit({ params, view }: HttpContext) {
                const card = await Card.findOrFail(params.id)
                return view.render('pages/cards/edit', { card })
        }

        async update({ params, request, response, session }: HttpContext) {
                const card = await Card.findOrFail(params.id)

                const payload = await request.validateUsing(updateCardValidator)

                card.merge(payload)
                await card.save()

                session.flash('success', 'La carte a été mise à jour !')
                return response.redirect().toRoute('decks.show', { id: card.deckId })
        }


        async destroy({ params, response, session }: HttpContext) {
                const card = await Card.findOrFail(params.id)
                const deckId = card.deckId

                await card.delete()

                session.flash('success', 'La carte a été supprimée.')
                return response.redirect().toRoute('decks.show', { id: deckId })
        }

}