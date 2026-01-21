import Teacher from '#models/teacher'
import type { HttpContext } from '@adonisjs/core/http'
export default class TeachersController {
  /**
  * Display a list of resource
  */
  async index({ view }: HttpContext) {
    const teachers = await Teacher.query()
      .orderBy('lastname', 'asc')
      .orderBy('firstname', 'asc')

    // On transforme les modèles en objets simples
    const teachersJSON = teachers.map((teacher) => teacher.serialize())

    return view.render('pages/home', { teachers: teachersJSON })
  }
  /**
  * Display form to create a new record
  */
  async create({ }: HttpContext) { }
  /**
  * Handle form submission for the create action
  */
  async store({ request }: HttpContext) { }
  /**
  * Show individual record
  */
  async show({ params, view }: HttpContext) {
    const teacher = await Teacher.query()
      .where('id', params.id)
      .preload('section')
      .firstOrFail()

    return view.render('pages/teachers.edge', {
      title: "Détail d'un enseignant",
      teacher: teacher.serialize() // Toujours mieux !
    })
  }
  /**
  * Edit individual record
  */
  async edit({ params }: HttpContext) { }

  /**
  * Handle form submission for the edit action
  */
  async update({ params, request }: HttpContext) { }
  /**
  * Delete record
  */
  async destroy({ params, session, response }: HttpContext) {

    const teacher = await Teacher.findOrFail(params.id)

    await teacher.delete()

    session.flash(
      'success',
      `L'enseignant ${teacher.lastname} ${teacher.firstname} a été supprimé avec
succès !`
    )
    // Redirige l'utilisateur sur la home
    return response.redirect().toRoute('home')
  }
}