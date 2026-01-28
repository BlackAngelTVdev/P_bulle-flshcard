import Section from '#models/section'
import { sectionValidator } from '#validators/section'
import type { HttpContext } from '@adonisjs/core/http'

export default class SectionsController {
    async index({ view }: HttpContext) {
        const sections = await Section.query().orderBy('name', 'asc')
        return view.render('pages/sections/index', { sections })
    }

    async create({ view }: HttpContext) {
        return view.render('pages/sections/create')
    }


    async store({ request, session, response }: HttpContext) {
        const { name } = await request.validateUsing(sectionValidator)

        const section = await Section.create({ name })

        session.flash('success', `La section ${section.name} a été créée avec succès !`)
        return response.redirect().toRoute('sections.index')
    }

    
    async destroy({ params, session, response }: HttpContext) {
        const section = await Section.findOrFail(params.id)
        await section.delete()

        session.flash('success', `La section ${section.name} a été supprimée avec succès !`)
        return response.redirect().toRoute('sections.index')
    }
}
