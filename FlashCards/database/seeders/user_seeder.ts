import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        username: 'Damien',
        email: 'damien@test.com',
        password: 'password123',
      },
      {
        username: 'EtudiantSolide',
        email: 'etudiant@test.com',
        password: 'password123',
      },
    ])
  }
}