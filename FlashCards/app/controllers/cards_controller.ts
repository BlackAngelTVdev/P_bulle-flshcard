import type { HttpContext } from '@adonisjs/core/http'

export default class CardsController {
        async index({ view }: HttpContext) {
                return view.render('cards/index')
        }
        async create({ view }: HttpContext) {
                return view.render('cards/create')
        }
        async store({ request, response }: HttpContext) {
                // Logique pour stocker une nouvelle carte
                return response.redirect().toRoute('cards.index')
        }
        async show({ params, view }: HttpContext) {
                return view.render('cards/show', { id: params.id })
        }
        async edit({ params, view }: HttpContext) {
                return view.render('cards/edit', { id: params.id })
        }
        async update({ params, request, response }: HttpContext) {
                // Logique pour mettre à jour une carte existante
                return response.redirect().toRoute('cards.index')
        }
        async destroy({ params, response }: HttpContext) {
                // Logique pour supprimer une carte
                return response.redirect().toRoute('cards.index')
        }

}