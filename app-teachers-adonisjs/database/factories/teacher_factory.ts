import factory from '@adonisjs/lucid/factories'
import Teacher from '#models/teacher'
export const TeacherFactory = factory
  .define(Teacher, async ({ faker }) => {
    const firstname = faker.person.firstName() // Génère un prénom réaliste
    const lastname = faker.person.lastName() // Génère un nom de famille réaliste
    return {
      firstname: firstname,
      lastname: lastname,
      nickname:
        `${firstname.charAt(0)}${lastname.charAt(0)}${lastname.slice(-1)}`,
      gender: faker.helpers.arrayElement(['man', 'woman', 'other']),

      origine: faker.lorem.word(4),
      sectionId: faker.number.int({ min: 1, max: 6 }),
    }
  })
  .build()