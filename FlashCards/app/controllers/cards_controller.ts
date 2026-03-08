import Card from '#models/card'
import type { HttpContext } from '@adonisjs/core/http'
import { createCardValidator, updateCardValidator } from '#validators/card'
import AIService from '#services/ai_service'
import Deck from '#models/deck'
import { DateTime } from 'luxon'

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
    const deckId = request.input('deckId')

    // Accepte images ET documents (PDF, DOCX, PPTX)
    const allAllowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'docx', 'pptx']

    const courseFiles = request.files('courseFiles', {
      size: '20mb',
      extnames: allAllowedExts,
    })

    const legacyImages = request.files('courseImages', {
      size: '5mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp'],
    })

    const singleImage = request.file('courseImage', {
      size: '5mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp'],
    })

    const allFiles = [
      ...courseFiles,
      ...legacyImages,
      ...(singleImage ? [singleImage] : []),
    ].filter((f) => f.isValid)

    // --- Vérification deckId ---
    if (!deckId) {
      session.flash('error', 'Deck non spécifié.')
      return response.redirect().back()
    }

    // --- Vérification propriété du deck ---
    const deck = await Deck.query()
      .where('id', deckId)
      .where('userId', auth.user!.id)
      .first()

    if (!deck) {
      session.flash('error', 'Accès refusé ou deck inexistant.')
      return response.redirect().toRoute('decks.index')
    }

    // -------------------------------------------------------
    // CAS IA : Au moins un fichier valide
    // -------------------------------------------------------
    if (allFiles.length > 0) {
      const user = auth.user!
      if (!user.canUseAiToday()) {
        const resetTime = user.aiResetTime().toFormat('HH:mm')
        session.flash(
          'error',
          `Tu as déjà utilisé l'IA aujourd'hui. Reviens après minuit (réinitialisation à ${resetTime}).`
        )
        return response.redirect().back()
      }

      try {
        const aiService = new AIService()
        const { cards: rawCards, errors } = await aiService.generateFromFiles(allFiles)

        if (rawCards.length === 0) {
          session.flash(
            'error',
            errors.length > 0
              ? `Aucune carte générée. Erreurs : ${errors.join(' | ')}`
              : "L'IA n'a pas pu extraire de contenu. Essaie avec des fichiers plus lisibles."
          )
          return response.redirect().back()
        }

        const cardsToCreate = rawCards.map((card) => ({
          question: card.question,
          answer: card.answer,
          deckId: deck.id,
        }))

        await Card.createMany(cardsToCreate)

        if (!user.isAdmin) {
          user.lastAiRequestAt = DateTime.now()
          await user.save()
        }

        const successMsg = `✨ ${cardsToCreate.length} cartes générées depuis ${allFiles.length} fichier(s) !`
        const warnMsg = errors.length > 0 ? ` (${errors.length} fichier(s) ignoré(s))` : ''
        session.flash('success', successMsg + warnMsg)

        return response.redirect().toRoute('decks.show', { id: deck.id })
      } catch (error) {
        session.flash('error', `Erreur IA : ${error.message}`)
        return response.redirect().back()
      }
    }

    // -------------------------------------------------------
    // CAS MANUEL : Pas de fichier
    // -------------------------------------------------------
    const invalidFiles = [
      ...request.files('courseFiles'),
      ...request.files('courseImages'),
    ].filter((f) => !f.isValid)

    if (invalidFiles.length > 0) {
      const msgs = invalidFiles.flatMap((f) => f.errors.map((e) => e.message))
      session.flash('error', `Fichiers invalides : ${msgs.join(', ')}`)
      return response.redirect().back()
    }

    try {
      const payload = await request.validateUsing(createCardValidator)
      await Card.create({ ...payload, deckId: deck.id })
      session.flash('success', 'Carte créée avec succès !')
      return response.redirect().toRoute('decks.show', { id: deck.id })
    } catch (error) {
      session.flash('error', 'Veuillez remplir les champs Question et Réponse, ou fournir un fichier.')
      return response.redirect().back()
    }
  }

  // -------------------------------------------------------
  // GET /cards/:id
  // -------------------------------------------------------
  async show({ params, view }: HttpContext) {
    const card = await Card.query().where('id', params.id).preload('deck').firstOrFail()
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