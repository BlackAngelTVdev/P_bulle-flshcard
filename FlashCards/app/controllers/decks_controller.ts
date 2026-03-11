import Deck from '#models/deck'
import type { HttpContext } from '@adonisjs/core/http'
import { createDeckValidator, updateDeckValidator } from '#validators/deck'

export default class DecksController {
  // 1. Affiche tous les decks publics
  async index({ view }: HttpContext) {
    const decks = await Deck.query().withCount('cards').orderBy('category', 'asc')

    // On groupe les decks par catégorie
    const groupedDecks = decks.reduce(
      (acc, deck) => {
        const cat = deck.category || 'Autre'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(deck)
        return acc
      },
      {} as Record<string, Deck[]>
    )

    return view.render('pages/home', { groupedDecks })
  }

  // 2. Affiche uniquement mes decks

  async myDecks({ auth, view }: HttpContext) {
    const decks = await Deck.query()
      .where('userId', auth.user!.id)
      .withCount('cards')
      // Important : Trie par catégorie pour que l'affichage soit ordonné
      .orderBy('category', 'asc')

    // La logique de regroupement que tu voulais
    const groupedDecks = decks.reduce(
      (acc, deck) => {
        const cat = deck.category || 'Autre'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(deck)
        return acc
      },
      {} as Record<string, Deck[]>
    )

    // On passe 'groupedDecks' à la vue, comme dans ton index
    return view.render('pages/home', { groupedDecks })
  }

  async create({ view }: HttpContext) {
    return view.render('pages/deck/create')
  }

  async store({ auth, request, response, session }: HttpContext) {
    // Le payload contiendra maintenant 'category' grâce au validator
    const payload = await request.validateUsing(createDeckValidator)

    await Deck.create({
      ...payload,
      userId: auth.user!.id,
    })

    session.flash('success', 'Deck créé avec succès !')
    return response.redirect().toRoute('decks.mine')
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
      data: { ...request.all(), id: Number(params.id) }, // 👈 conversion en number
    })

    deck.merge(payload)
    await deck.save()

    session.flash('success', 'Deck modifié avec succès !')
    return response.redirect().toRoute('decks.mine')
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

  async play({ params, view }: HttpContext) {
    const deck = await Deck.findOrFail(params.id)
    
    // On compte le nombre total de cartes pour l'afficher dans le setup
    await deck.loadCount('cards')
    const cardsCount = deck.$extras.cards_count

    return view.render('pages/deck/play', { deck, cardsCount })
  }

  // 4. Lancement du jeu avec le mode sélectionné
  async game({ params, request, view }: HttpContext) {
    const deck = await Deck.findOrFail(params.id)
    
    // On récupère le mode ET la limite
    const mode = request.input('mode', 'basique')
    
    // On transforme la limite en nombre entier. Si c'est vide, on met 20 par défaut.
    const limit = Number(request.input('limit', 20))

    // On charge les cartes : Aléatoire + Limite
    const cards = await deck.related('cards').query()
      .orderByRaw('RAND()') // Pour MySQL (si tu étais sur SQLite, ce serait RANDOM())
      .limit(limit)

    return view.render('pages/deck/game', { 
      deck, 
      cards, 
      mode, 
      limit: cards.length // On renvoie la longueur réelle (au cas où le deck a moins de cartes que la limite)
    })
  }

  // 5. Page des résultats finaux
  async result({ params, request, view }: HttpContext) {
    const deck = await Deck.findOrFail(params.id)
    
    // On récupère les stats de fin de partie
    const score = request.input('score', 0)
    const total = request.input('total', 0)
    const mode = request.input('mode', 'basique')

    return view.render('pages/deck/result', { 
      deck, 
      score, 
      total, 
      mode 
    })
  }
}