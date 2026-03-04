import Card from '#models/card'
import type { HttpContext } from '@adonisjs/core/http'
import { createCardValidator, updateCardValidator } from '#validators/card'
import AIService from '#services/ai_service'
import Deck from '#models/deck'

export default class CardsController {
  // -------------------------------------------------------
  // GET /cards/create?deckId=X
  // -------------------------------------------------------
  async create({ view, request }: HttpContext) {
    const deckId = request.input('deckId')
    return view.render('pages/cards/create', { deckId })
  }

  // -------------------------------------------------------
  // POST /cards
  // -------------------------------------------------------
  async store({ request, auth, response, session }: HttpContext) {
    // --- 1. Récupération des données de base ---
    const deckId = request.input('deckId')
    const courseImage = request.file('courseImage', {
      size: '5mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp'],
    })

    // --- 2. Vérification du deckId ---
    if (!deckId) {
      session.flash('error', 'Deck non spécifié.')
      return response.redirect().back()
    }

    // --- 3. Vérification que le deck appartient à l'utilisateur ---
    const deck = await Deck.query()
      .where('id', deckId)
      .where('userId', auth.user!.id)
      .first()

    if (!deck) {
      session.flash('error', 'Accès refusé ou deck inexistant.')
      return response.redirect().toRoute('decks.index')
    }

    // -------------------------------------------------------
    // CAS IA : Une image a été fournie
    // -------------------------------------------------------
    if (courseImage && courseImage.isValid) {
      try {
        const aiService = new AIService()
        const rawCards = await aiService.generateFromImage(courseImage)

        if (rawCards.length === 0) {
          session.flash('error', "L'IA n'a pas pu extraire de contenu de cette image. Essaie avec une image plus lisible.")
          return response.redirect().back()
        }

        // Préparation et insertion en base
        const cardsToCreate = rawCards.map((card: { question: string; answer: string }) => ({
          question: card.question,
          answer: card.answer,
          deckId: deck.id,
        }))

        await Card.createMany(cardsToCreate)

        session.flash('success', `✨ ${cardsToCreate.length} cartes générées par l'IA et ajoutées au deck !`)
        return response.redirect().toRoute('decks.show', { id: deck.id })

      } catch (error) {
        session.flash('error', `Erreur IA : ${error.message}`)
        return response.redirect().back()
      }
    }

    // -------------------------------------------------------
    // CAS MANUEL : Pas d'image, on valide les champs
    // -------------------------------------------------------

    // Image invalide (présente mais corrompue ou mauvais format)
    if (courseImage && !courseImage.isValid) {
      session.flash('error', `Image invalide : ${courseImage.errors.map((e) => e.message).join(', ')}`)
      return response.redirect().back()
    }

    try {
      const payload = await request.validateUsing(createCardValidator)

      await Card.create({ ...payload, deckId: deck.id })

      session.flash('success', 'Carte créée avec succès !')
      return response.redirect().toRoute('decks.show', { id: deck.id })

    } catch (error) {
      session.flash('error', 'Veuillez remplir les champs Question et Réponse, ou fournir une image.')
      return response.redirect().back()
    }
  }

  // -------------------------------------------------------
  // GET /cards/:id
  // -------------------------------------------------------
  async show({ params, view }: HttpContext) {
    const card = await Card.query()
      .where('id', params.id)
      .preload('deck')
      .firstOrFail()

    return view.render('pages/cards/show', { card })
  }

  // -------------------------------------------------------
  // GET /cards/:id/edit
  // -------------------------------------------------------
  async edit({ params, view }: HttpContext) {
    const card = await Card.findOrFail(params.id)
    return view.render('pages/cards/edit', { card })
  }

  // -------------------------------------------------------
  // PUT /cards/:id
  // -------------------------------------------------------
  async update({ params, request, response, session }: HttpContext) {
    const card = await Card.findOrFail(params.id)
    const payload = await request.validateUsing(updateCardValidator)

    card.merge(payload)
    await card.save()

    session.flash('success', 'La carte a été mise à jour !')
    return response.redirect().toRoute('decks.show', { id: card.deckId })
  }

  // -------------------------------------------------------
  // DELETE /cards/:id
  // -------------------------------------------------------
  async destroy({ params, response, session }: HttpContext) {
    const card = await Card.findOrFail(params.id)
    const deckId = card.deckId

    await card.delete()

    session.flash('success', 'La carte a été supprimée.')
    return response.redirect().toRoute('decks.show', { id: deckId })
  }
}