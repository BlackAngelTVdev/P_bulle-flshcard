import Section from '#models/section'
import Teacher from '#models/teacher'
import { teacherValidator } from '#validators/teacher'
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
  async create({ view }: HttpContext) {
    // Récupération des sections triées par le nom
    const sections = await Section.query().orderBy('name', 'asc')
    // Appel de la vue
    return view.render('pages/create', {
      title: "Ajout d'un enseignant",
      sections
    })
  }
  /**
  * Handle form submission for the create action
  */
  async store({ request, session, response }: HttpContext) {
    // Validation des données saisies par l'utilisateur
    const { gender, firstname, lastname, nickname, origine, sectionId } =
      await request.validateUsing(teacherValidator)
    // Création du nouvel enseignant
    const teacher = await Teacher.create({
      gender, firstname, lastname, nickname,
      origine, sectionId
    })
    // Afficher un message à l'utilisateur
    session.flash('success', `Le nouvel enseignant ${teacher.lastname}
    ${teacher.firstname} a été ajouté avec succès !`)
    // Rediriger vers la homepage
    return response.redirect().toRoute('home')
  }
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
      `L'enseignant ${teacher.lastname} ${teacher.firstname} a été supprimé avec succès !`
    )
    // Redirige l'utilisateur sur la home
    return response.redirect().toRoute('home')
  }
}