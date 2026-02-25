import Deck from '#models/deck'
import type { HttpContext } from '@adonisjs/core/http'
import { createDeckValidator, updateDeckValidator } from '#validators/deck'

export default class DecksController {
    
    // 1. Affiche tous les decks publics
    async index({ view }: HttpContext) {
        const decks = await Deck.query().withCount('cards').orderBy('createdAt', 'desc')
        return view.render('pages/home', { decks })
    }

    // 2. Affiche uniquement mes decks
    async myDecks({ auth, view }: HttpContext) {
        const decks = await Deck.query()
            .where('userId', auth.user!.id)
            .withCount('cards')
            .orderBy('createdAt', 'desc')

        return view.render('pages/home', { decks })
    }

    async create({ view }: HttpContext) {
        return view.render('pages/deck/create')
    }

    async store({ auth, request, response, session }: HttpContext) {
        const payload = await request.validateUsing(createDeckValidator)
        
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

    async edit({ params, auth, view, response }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        
        // Sécurité : Seul le proprio peut édit
        if (deck.userId !== auth.user!.id) {
            return response.forbidden('Tu ne peux pas modifier ce deck !')
        }
        
        return view.render('pages/deck/edit', { deck })
    }

    async update({ params, request, response, session, auth }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)

        if (deck.userId !== auth.user!.id) {
            return response.forbidden()
        }

        const payload = await request.validateUsing(updateDeckValidator, {
            data: { ...request.all(), id: params.id },
        })

        deck.merge(payload)
        await deck.save()

        session.flash('success', 'Deck modifié avec succès !')
        return response.redirect().toRoute('decks.index')
    }

    async destroy({ params, response, session, auth }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        
        if (deck.userId !== auth.user!.id) {
            return response.forbidden()
        }

        await deck.delete()
        session.flash('success', 'Deck supprimé avec succès !')
        return response.redirect().toRoute('decks.index')
    }

    // 3. Page de sélection du mode (Basique, Survie, Chrono)
    async play({ params, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        return view.render('pages/deck/play', { deck })
    }

    // 4. Lancement du jeu avec le mode sélectionné
    async game({ params, request, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        await deck.load('cards')
        
        // On récupère le mode choisi, 'basique' par défaut
        const mode = request.input('mode', 'basique') 
        
        return view.render('pages/deck/game', { deck, mode })
    }

    // 5. Page des résultats finaux
    async result({ params, request, view }: HttpContext) {
        const deck = await Deck.findOrFail(params.id)
        const score = request.input('score', 0)
        const total = request.input('total', 0)
        const mode = request.input('mode', 'basique')

        return view.render('pages/deck/result', { deck, score, total, mode })
    }
}