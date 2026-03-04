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
    console.log(`\n📋 [CardsController.create] Affichage du formulaire — deckId: ${deckId}`)
    return view.render('pages/cards/create', { deckId })
  }

  // -------------------------------------------------------
  // POST /cards
  // -------------------------------------------------------
  async store({ request, auth, response, session }: HttpContext) {
    console.log('\n========================================')
    console.log('💾 [CardsController.store] Démarrage')
    console.log('========================================')

    const deckId = request.input('deckId')

    // Récupération de PLUSIEURS images (input name="courseImages[]")
    const courseImages = request.files('courseImages', {
      size: '5mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp'],
    })

    // Rétrocompatibilité : on accepte aussi l'ancien input "courseImage" (une seule)
    const singleImage = request.file('courseImage', {
      size: '5mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp'],
    })

    // On fusionne : plusieurs + éventuelle image unique
    const allImages = [
      ...courseImages,
      ...(singleImage ? [singleImage] : []),
    ].filter((img) => img.isValid)

    console.log(`📥 [CardsController.store] Données reçues:`)
    console.log(`   - deckId         : ${deckId}`)
    console.log(`   - question       : ${request.input('question') || '(vide)'}`)
    console.log(`   - images valides : ${allImages.length}`)
    allImages.forEach((img, i) => console.log(`     [${i + 1}] ${img.clientName} (${img.size} bytes)`))

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
    console.log(`✅ [CardsController.store] Deck #${deck.id} "${deck.name}" validé.`)

    // -------------------------------------------------------
    // CAS IA : Au moins une image valide
    // -------------------------------------------------------
    if (allImages.length > 0) {
      console.log(`\n🤖 [CardsController.store] Mode IA — ${allImages.length} image(s) à traiter...`)

      try {
        const aiService = new AIService()
        const { cards: rawCards, errors } = await aiService.generateFromImages(allImages)

        // Si certaines images ont échoué on le signale mais on continue avec ce qu'on a
        if (errors.length > 0) {
          console.warn(`⚠️ ${errors.length} image(s) ont échoué:`, errors)
        }

        if (rawCards.length === 0) {
          session.flash(
            'error',
            errors.length > 0
              ? `Aucune carte générée. Erreurs : ${errors.join(' | ')}`
              : "L'IA n'a pas pu extraire de contenu. Essaie avec des images plus lisibles."
          )
          return response.redirect().back()
        }

        const cardsToCreate = rawCards.map((card) => ({
          question: card.question,
          answer: card.answer,
          deckId: deck.id,
        }))

        console.log(`💾 [CardsController.store] Insertion de ${cardsToCreate.length} cartes...`)
        await Card.createMany(cardsToCreate)

        // Message de succès avec info sur les erreurs éventuelles
        const successMsg = `✨ ${cardsToCreate.length} cartes générées depuis ${allImages.length} image(s) !`
        const warnMsg = errors.length > 0 ? ` (${errors.length} image(s) ignorée(s))` : ''
        session.flash('success', successMsg + warnMsg)

        return response.redirect().toRoute('decks.show', { id: deck.id })
      } catch (error) {
        console.error('\n❌ [CardsController.store] Erreur IA:', error.message)
        session.flash('error', `Erreur IA : ${error.message}`)
        return response.redirect().back()
      }
    }

    // -------------------------------------------------------
    // CAS MANUEL : Pas d'image
    // -------------------------------------------------------
    console.log('\n✍️  [CardsController.store] Mode manuel...')

    // Images présentes mais toutes invalides
    const invalidImages = request.files('courseImages').filter((img) => !img.isValid)
    if (invalidImages.length > 0) {
      const msgs = invalidImages.flatMap((img) => img.errors.map((e) => e.message))
      session.flash('error', `Images invalides : ${msgs.join(', ')}`)
      return response.redirect().back()
    }

    try {
      const payload = await request.validateUsing(createCardValidator)
      await Card.create({ ...payload, deckId: deck.id })
      console.log(`💾 [CardsController.store] Carte manuelle créée dans deck #${deck.id}.`)
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