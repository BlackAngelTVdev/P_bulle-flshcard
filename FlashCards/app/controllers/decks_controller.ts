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
}