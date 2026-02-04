import Deck from '#models/deck'
import type { HttpContext } from '@adonisjs/core/http'

export default class DecksController {
    async index({ view }: HttpContext) {
        const decks = await Deck.all()
        return view.render('pages/home', { decks })
    }
    async create({ view }: HttpContext) {
        return view.render('pages/deck/create')
    }
    async store({ request, response, session }: HttpContext) {
        const deckData = request.only(['name', 'description'])

        const deck = new Deck()
        deck.name = deckData.name
        deck.description = deckData.description

        try {
            await deck.save()
            session.flash('success', 'Deck created successfully!')
            return response.redirect().toRoute('decks.index')
        } catch (error) {
            session.flash('error', 'There was an error creating the deck.')
            return response.redirect().back()
        }
    }
    async show({ params, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        return view.render('pages/deck/show', { deck })
    }

    async edit({ params, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        return view.render('pages/deck/edit', { deck })
    }

    async update({ params, request, response, session }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        const deckData = request.only(['name', 'description'])

        deck.name = deckData.name
        deck.description = deckData.description

        try {
            await deck.save()
            session.flash('success', 'Deck updated successfully!')
            return response.redirect().toRoute('decks.index')
        } catch (error) {
            session.flash('error', 'There was an error updating the deck.')
            return response.redirect().back()
        }
    }

    async destroy({ params, response, session }: HttpContext) {
        // 1. On cherche le deck. Si pas trouvé -> Erreur 404 auto (findOrFail)
        const deck = await Deck.findOrFail(params.id)

        // 2. Supprimer (Adonis gère les erreurs de DB si tu as un souci de contraintes)
        await deck.delete()

        // 3. Feedback utilisateur (Messages flash)
        session.flash('success', 'Le deck a bien été supprimé.')

        return response.redirect().toRoute('decks.index')
    }
}
