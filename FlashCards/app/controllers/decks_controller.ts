import Deck from '#models/deck'
import type { HttpContext } from '@adonisjs/core/http'
import { createDeckValidator, updateDeckValidator } from '#validators/deck'


export default class DecksController {
    async index({ view }: HttpContext) {
        const decks = await Deck.query().withCount('cards')
        return view.render('pages/home', { decks })
    }
    async myDecks({ auth, view }: HttpContext) {
        const decks = await Deck.query()
            .where('userId', auth.user!.id)
            .withCount('cards') // permet de compter les cartes associées à chaque deck
            .orderBy('createdAt', 'desc')

        return view.render('pages/home', { decks })
    }

    async create({ view }: HttpContext) {
        return view.render('pages/deck/create')
    }

    // On ajoute 'auth' dans les arguments du HttpContext
    async store({ auth, request, response, session }: HttpContext) {

        // 1. Validation (name, description, etc.)
        const payload = await request.validateUsing(createDeckValidator)

        // 2. Création avec injection du userId de l'utilisateur connecté
        // On merge le payload avec l'id de l'user authentifié
        await Deck.create({
            ...payload,
            userId: auth.user!.id
        })

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
    async play({ params, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        await deck.load('cards')
        return view.render('pages/deck/play', { deck })
    }
    async game({ params, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        await deck.load('cards')
        return view.render('pages/deck/game', { deck })
    }
    async result({ params, request, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        const score = request.input('score')
        const total = request.input('total')

        return view.render('pages/deck/result', { deck, score, total })
    }
}