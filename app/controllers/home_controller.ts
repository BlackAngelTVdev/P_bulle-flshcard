import Deck from '#models/deck'
import { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  async index({ view }: HttpContext) {
    // On récupère le nombre total de decks dans la base
    const totalDecksResult = await Deck.query().count('* as total')
    const totalDecks = totalDecksResult[0].$extras.total

    // On passe la variable à la vue
    return view.render('pages/index', { totalDecks })
  }
}
