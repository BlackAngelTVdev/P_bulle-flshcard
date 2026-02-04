import Deck from '#models/deck'
import type { HttpContext } from '@adonisjs/core/http'
import { createDeckValidator, updateDeckValidator } from '#validators/deck'


export default class DecksController {
    async index({ view }: HttpContext) {
        const decks = await Deck.query().withCount('cards')
        return view.render('pages/home', { decks })
    }

    async create({ view }: HttpContext) {
        return view.render('pages/deck/create')
    }

    async store({ request, response, session }: HttpContext) {
        // Pas de try/catch ici pour la validation, Adonis gère le redirect back() tout seul
        const payload = await request.validateUsing(createDeckValidator, {
            
        })

        await Deck.create(payload)

        session.flash('success', 'Deck créé avec succès !')
        return response.redirect().toRoute('decks.index')
    }

    async show({ params, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        await deck.load('cards')
        return view.render('pages/deck/show', { deck })
    }

    async edit({ params, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        return view.render('pages/deck/edit', { deck })
    }

    async update({ params, request, response, session }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)

        const payload = await request.validateUsing(updateDeckValidator, {
            data: { ...request.all(), id: params.id },
            
        })

        deck.merge(payload)
        await deck.save()

        session.flash('success', 'Deck modifié avec succès !')
        return response.redirect().toRoute('decks.index')
    }
    async destroy({ params, response, session }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        await deck.delete()
        session.flash('success', 'Deck supprimé avec succès !')
        return response.redirect().toRoute('decks.index')
    }
}