import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        username: 'Damien',
        email: 'dami.scoot3@gmail.com',
        password: 'admin1234',
        isAdmin: true
      },
      {
        username: 'EtudiantSolide',
        email: 'etudiant@test.com',
        password: 'password123',
      },
    ])
  }
}