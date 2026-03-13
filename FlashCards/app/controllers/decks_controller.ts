import Deck from '#models/deck'
import GameSession from '#models/game_session'
import UserCardStat from '#models/user_card_stat'
import type { HttpContext } from '@adonisjs/core/http'
import { createDeckValidator, updateDeckValidator } from '#validators/deck'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

const toPositiveIntArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return []

  const normalized = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)

  return [...new Set(normalized)]
}

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase())
  return false
}

export default class DecksController {
  // 1. Affiche tous les decks publics
  async index({ view, request }: HttpContext) {
    const q = (request.input('q', '') || '').toString().trim()

    // Construire la query et appliquer le filtre si nécessaire
    const qb = Deck.query().withCount('cards')
    if (q) {
      qb.where((builder) => {
        builder
          .where('name', 'like', `%${q}%`)
          .orWhere('description', 'like', `%${q}%`)
          .orWhere('category', 'like', `%${q}%`)
      })
    }

    const decks = await qb.orderBy('category', 'asc')

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

    return view.render('pages/home', { groupedDecks, q })
  }

  // 2. Affiche uniquement mes decks

  async myDecks({ auth, view, request }: HttpContext) {
    const q = (request.input('q', '') || '').toString().trim()

    const qb = Deck.query()
      .where('userId', auth.user!.id)
      .withCount('cards')
      // Important : Trie par catégorie pour que l'affichage soit ordonné

    if (q) {
      qb.where((builder) => {
        builder
          .where('name', 'like', `%${q}%`)
          .orWhere('description', 'like', `%${q}%`)
          .orWhere('category', 'like', `%${q}%`)
      })
    }

    const decks = await qb.orderBy('category', 'asc')

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
    return view.render('pages/home', { groupedDecks, q })
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

  async play({ params, view, auth }: HttpContext) {
    const deck = await Deck.findOrFail(params.id)

    await deck.loadCount('cards')
    const cardsCount = Number(deck.$extras.cards_count || 0)

    const playedRow = await db
      .from('user_card_stats')
      .where('user_id', auth.user!.id)
      .where('deck_id', deck.id)
      .count('* as total')
      .first()

    const failedRow = await db
      .from('user_card_stats')
      .where('user_id', auth.user!.id)
      .where('deck_id', deck.id)
      .where('last_result', false)
      .count('* as total')
      .first()

    const playedCount = Number(playedRow?.total || 0)
    const failedCount = Number(failedRow?.total || 0)
    const unplayedCount = Math.max(cardsCount - playedCount, 0)

    return view.render('pages/deck/play', {
      deck,
      cardsCount,
      playedCount,
      failedCount,
      unplayedCount,
    })
  }

  // 4. Lancement du jeu avec le mode sélectionné
  async game({ params, request, view, auth, response, session }: HttpContext) {
    const deck = await Deck.findOrFail(params.id)

    // On récupère le mode ET la limite
    const mode = request.input('mode', 'basique')
    const cardFilter = request.input('cardFilter', 'all')
    const limitInput = request.input('limit', 20)
    const requestedLimit = Number(limitInput)

    const cardsQuery = deck.related('cards').query()

    if (cardFilter === 'unplayed') {
      cardsQuery.whereNotExists((subQuery) => {
        subQuery
          .from('user_card_stats')
          .whereColumn('user_card_stats.card_id', 'cards.id')
          .where('user_card_stats.user_id', auth.user!.id)
          .where('user_card_stats.deck_id', deck.id)
      })
    }

    if (cardFilter === 'failed') {
      cardsQuery.whereExists((subQuery) => {
        subQuery
          .from('user_card_stats')
          .whereColumn('user_card_stats.card_id', 'cards.id')
          .where('user_card_stats.user_id', auth.user!.id)
          .where('user_card_stats.deck_id', deck.id)
          .where('user_card_stats.last_result', false)
      })
    }

    if (cardFilter === 'session_wrong') {
      const sessionId = Number(request.input('sessionId', 0))
      const previousSession = await GameSession.query()
        .where('id', sessionId)
        .where('user_id', auth.user!.id)
        .where('deck_id', deck.id)
        .first()

      const wrongIds = previousSession?.wrongCardIds || []

      if (!wrongIds.length) {
        session.flash('error', 'Aucune carte ratée à rejouer pour cette session.')
        return response.redirect().toRoute('decks.play', { id: deck.id })
      }

      cardsQuery.whereIn('id', wrongIds)
    }

    cardsQuery.orderByRaw('RAND()')

    if (Number.isFinite(requestedLimit) && requestedLimit > 0) {
      cardsQuery.limit(requestedLimit)
    }

    const cards = await cardsQuery

    if (!cards.length) {
      session.flash('error', 'Aucune carte disponible pour ce filtre.')
      return response.redirect().toRoute('decks.play', { id: deck.id })
    }

    const gameSession = await GameSession.create({
      userId: auth.user!.id,
      deckId: deck.id,
      mode,
      totalCards: cards.length,
      correctAnswers: 0,
      playedCardIds: [],
      correctCardIds: [],
      wrongCardIds: [],
      endedAt: null,
    })

    return view.render('pages/deck/game', { 
      deck, 
      cards, 
      mode, 
      cardFilter,
      gameSession,
      limit: cards.length,
    })
  }

  // 5. Page des résultats finaux
  async result({ params, request, view, auth }: HttpContext) {
    const deck = await Deck.findOrFail(params.id)

    const scoreInput = request.input('score')
    const totalInput = request.input('total')
    const mode = request.input('mode', 'basique')
    const sessionId = Number(request.input('sessionId', 0))

    const gameSession = sessionId
      ? await GameSession.query()
          .where('id', sessionId)
          .where('user_id', auth.user!.id)
          .where('deck_id', deck.id)
          .first()
      : null

    const wrongCardsCount = gameSession?.wrongCardIds?.length || 0
    const score = scoreInput !== undefined ? Number(scoreInput) : Number(gameSession?.correctAnswers || 0)
    const total = totalInput !== undefined ? Number(totalInput) : Number(gameSession?.totalCards || 0)

    return view.render('pages/deck/result', { 
      deck, 
      score, 
      total, 
      mode,
      sessionId,
      wrongCardsCount,
    })
  }

  async progress({ params, request, response, auth }: HttpContext) {
    const deck = await Deck.findOrFail(params.id)
    const body = request.body() as Record<string, unknown>
    const gameSessionId = Number(body.gameSessionId || 0)

    if (!gameSessionId) {
      return response.badRequest({ ok: false, message: 'Session invalide' })
    }

    const gameSession = await GameSession.query()
      .where('id', gameSessionId)
      .where('user_id', auth.user!.id)
      .where('deck_id', deck.id)
      .first()

    if (!gameSession) {
      return response.notFound({ ok: false, message: 'Session introuvable' })
    }

    const answersInput = Array.isArray(body.answers)
      ? body.answers
      : [{ cardId: body.cardId, isCorrect: body.isCorrect }]

    const answers = answersInput
      .map((item) => ({
        cardId: Number((item as Record<string, unknown>)?.cardId || 0),
        isCorrect: toBoolean((item as Record<string, unknown>)?.isCorrect),
      }))
      .filter((item) => Number.isInteger(item.cardId) && item.cardId > 0)

    if (!answers.length) {
      return response.ok({ ok: true, saved: 0 })
    }

    const uniqueCardIds = [...new Set(answers.map((item) => item.cardId))]
    const existingCards = await deck.related('cards').query().whereIn('id', uniqueCardIds).select('id')
    const validCardIds = new Set(existingCards.map((card) => card.id))

    const playedSet = new Set(gameSession.playedCardIds || [])
    const correctSet = new Set(gameSession.correctCardIds || [])
    const wrongSet = new Set(gameSession.wrongCardIds || [])

    let saved = 0

    for (const answer of answers) {
      if (!validCardIds.has(answer.cardId)) continue
      if (playedSet.has(answer.cardId)) continue

      playedSet.add(answer.cardId)
      if (answer.isCorrect) {
        correctSet.add(answer.cardId)
        wrongSet.delete(answer.cardId)
      } else {
        wrongSet.add(answer.cardId)
        correctSet.delete(answer.cardId)
      }

      const stat = await UserCardStat.firstOrCreate(
        {
          userId: auth.user!.id,
          deckId: deck.id,
          cardId: answer.cardId,
        },
        {
          playedCount: 0,
          correctCount: 0,
          wrongCount: 0,
          lastResult: false,
          lastPlayedAt: null,
        }
      )

      stat.playedCount += 1
      if (answer.isCorrect) {
        stat.correctCount += 1
      } else {
        stat.wrongCount += 1
      }
      stat.lastResult = answer.isCorrect
      stat.lastPlayedAt = DateTime.now()
      await stat.save()

      saved += 1
    }

    gameSession.merge({
      playedCardIds: [...playedSet],
      correctCardIds: [...correctSet],
      wrongCardIds: [...wrongSet],
      correctAnswers: correctSet.size,
    })
    await gameSession.save()

    return response.ok({ ok: true, saved })
  }

  async finish({ params, request, response, auth }: HttpContext) {
    const deck = await Deck.findOrFail(params.id)
    const body = request.body() as Record<string, unknown>

    const gameSessionId = Number(body.gameSessionId || 0)
    const mode = String(body.mode || 'basique')
    const total = Number(body.total || 0)
    const score = Number(body.score || 0)
    const playedCardIds = toPositiveIntArray(body.playedCardIds)
    const correctCardIds = toPositiveIntArray(body.correctCardIds)
    const wrongCardIds = toPositiveIntArray(body.wrongCardIds)

    const allCandidateIds = [...new Set([...playedCardIds, ...correctCardIds, ...wrongCardIds])]

    const existingCards = allCandidateIds.length
      ? await deck.related('cards').query().whereIn('id', allCandidateIds).select('id')
      : []

    const validCardIds = new Set(existingCards.map((card) => card.id))

    const normalizedPlayed = playedCardIds.filter((id) => validCardIds.has(id))
    const normalizedCorrect = correctCardIds.filter((id) => validCardIds.has(id))
    const normalizedWrong = wrongCardIds.filter((id) => validCardIds.has(id))

    let gameSession = gameSessionId
      ? await GameSession.query()
          .where('id', gameSessionId)
          .where('user_id', auth.user!.id)
          .where('deck_id', deck.id)
          .first()
      : null

    if (!gameSession) {
      gameSession = await GameSession.create({
        userId: auth.user!.id,
        deckId: deck.id,
        mode,
        totalCards: 0,
        correctAnswers: 0,
        playedCardIds: [],
        correctCardIds: [],
        wrongCardIds: [],
      })
    }

    const hasFallbackArrays = normalizedPlayed.length > 0 || normalizedCorrect.length > 0 || normalizedWrong.length > 0

    if (hasFallbackArrays) {
      for (const cardId of normalizedPlayed) {
        const isCorrect = normalizedCorrect.includes(cardId)
        const stat = await UserCardStat.firstOrCreate(
          {
            userId: auth.user!.id,
            deckId: deck.id,
            cardId,
          },
          {
            playedCount: 0,
            correctCount: 0,
            wrongCount: 0,
            lastResult: false,
            lastPlayedAt: null,
          }
        )

        stat.playedCount += 1
        if (isCorrect) {
          stat.correctCount += 1
        } else {
          stat.wrongCount += 1
        }
        stat.lastResult = isCorrect
        stat.lastPlayedAt = DateTime.now()
        await stat.save()
      }
    }

    gameSession.merge({
      mode,
      totalCards: Number.isFinite(total) && total > 0
        ? total
        : hasFallbackArrays
          ? normalizedPlayed.length
          : gameSession.totalCards,
      correctAnswers: Number.isFinite(score) && score >= 0
        ? score
        : hasFallbackArrays
          ? normalizedCorrect.length
          : gameSession.correctAnswers,
      playedCardIds: hasFallbackArrays ? normalizedPlayed : gameSession.playedCardIds,
      correctCardIds: hasFallbackArrays ? normalizedCorrect : gameSession.correctCardIds,
      wrongCardIds: hasFallbackArrays ? normalizedWrong : gameSession.wrongCardIds,
      endedAt: DateTime.now(),
    })
    await gameSession.save()

    return response.ok({
      ok: true,
      sessionId: gameSession.id,
    })
  }
}