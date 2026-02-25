import Card from '#models/card'
import type { HttpContext } from '@adonisjs/core/http'
import { createCardValidator, updateCardValidator } from '#validators/card'
export default class CardsController {
        async create({ view }: HttpContext) {
                return view.render('pages/cards/create')
        }
        async store({ request, response, session }: HttpContext) {

                const payload = await request.validateUsing(createCardValidator)

                const card = await Card.create(payload)

                session.flash('success', 'Carte ajoutée avec succès !')

                return response.redirect().toRoute('decks.show', { id: card.deckId })
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