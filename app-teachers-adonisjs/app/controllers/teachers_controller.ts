import Section from '#models/section'
import Teacher from '#models/teacher'
import { teacherValidator } from '#validators/teacher'
import type { HttpContext } from '@adonisjs/core/http'
export default class TeachersController {
  // envoie la page home avec tous les prof odrer par nom et prénom
  async index({ view }: HttpContext) {
    const teachers = await Teacher.query()
    .orderBy('lastname', 'asc')
    .orderBy('firstname', 'asc')
    
    // On transforme les modèles en objets simples
    
    const teachersJSON = teachers.map((teacher) => teacher.serialize())
    return view.render('pages/home', { teachers: teachersJSON })
  }

  // Affiche le formulaire de création d'un nouvel enseignant
  async create({ view }: HttpContext) {
    // Récupération des sections triées par le nom
    const sections = await Section.query().orderBy('name', 'asc')
    // Afficher la vue avec les sections dedans
    return view.render('pages/create', {
      title: "Ajout d'un enseignant",
      sections
    })
  }
  
  // Gérer la soumission du formulaire pour la création d'un nouvel enseignant
  async store({ request, session, response }: HttpContext) {

    // Validation des données saisies par l'utilisateur (validateur teacherValidator)
    const { gender, firstname, lastname, nickname, origine, sectionId } = await request.validateUsing(teacherValidator)
    
    // Création du nouvel enseignant dans la DB
    const teacher = await Teacher.create({
      gender, firstname, lastname, nickname,
      origine, sectionId
    })

    // Afficher un message à l'utilisateur
    session.flash('success', `Le nouvel enseignant ${teacher.lastname} ${teacher.firstname} a été ajouté avec succès !`)

    // Redirige l'utilisateur sur la home
    return response.redirect().toRoute('home')
  }

  // Affiche les détails d'un enseignant
  async show({ params, view }: HttpContext) {

    // Récupération de l'enseignant
    const teacher = await Teacher.query()

    // avec sa section associée 
      .where('id', params.id)
      .preload('section')
      .firstOrFail()
// Afficher la vue
    return view.render('pages/teachers.edge', {
      title: "Détail d'un enseignant",
      teacher: teacher.serialize() // on transforme le modèle en objet simple
    })
  }

  // Affiche le formulaire pour éditer un enseignant
  async edit({ params, view }: HttpContext) {

    // Récupération de l'enseignant
    const teacher = await Teacher.findOrFail(params.id)
    
    // Récupération des sections triées par le nom
    const sections = await Section.query().orderBy('name', 'asc')

    // Afficher la vue
    return view.render('pages/edit.edge', {
      title: 'Modifier un enseignant',
      teacher,
      sections,
    })
  }
  
  // Gérer la soumission du formulaire pour mettre à jour un enseignant
  async update({ params, request, session, response }: HttpContext) {
    // Validation des données saisies par l'utilisateur
    const { gender, firstname, lastname, nickname, origine, sectionId } =
      await request.validateUsing(teacherValidator)
    // Sélectionner l'enseignant dont on veut mettre à jour des informations
    const teacher = await Teacher.findOrFail(params.id)
    // Met à jour les infos de l'enseignant
    teacher.merge({
      gender,
      firstname,
      lastname,
      nickname,
      origine,
      sectionId,
    })
    const teacherUpdated = await teacher.save()
    // Afficher un message à l'utilisateur
    session.flash(
      'success',
      `L'enseignant ${teacherUpdated.lastname} ${teacherUpdated.firstname} a été mis à jour avec succès !`
    )
    // Redirige l'utilisateur sur la home
    return response.redirect().toRoute('home')
  }
  async destroy({ params, session, response }: HttpContext) {

    const teacher = await Teacher.findOrFail(params.id)

    await teacher.delete()
    // Afficher un message à l'utilisateur
    session.flash(
      'success',
      `L'enseignant ${teacher.lastname} ${teacher.firstname} a été supprimé avec succès !`
    )
    // Redirige l'utilisateur sur la home
    return response.redirect().toRoute('home')
  }
}