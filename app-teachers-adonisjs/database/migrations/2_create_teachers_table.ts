import { BaseSchema } from '@adonisjs/lucid/schema'
export default class extends BaseSchema {
  protected tableName = 'teachers'
  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // Champ genre pour lequel on définit un enum avec pour valeur par défaut
      'woman'
      table.enum('gender', ['woman', 'man',
        'other']).notNullable().defaultTo('woman')
      // Champ prénom
      table.string('firstname').notNullable()
      // Champ nom
      table.string('lastname').notNullable()
      // Champ surnom
      table.string('nickname').notNullable()
      // Champ origine du prénom
      table.string('origine').notNullable()
      // Clé étrangère de la section
      table
        .integer('section_id') // Clé étrangère
        .unsigned() // La clé ne doit pas être négative
        .references('id') // Référence la colonne `id` de la table `section`
        .inTable('sections') // Nom de la table de référence
        .onDelete('CASCADE') // Supprime les teachers si la section est supprimée
        .onUpdate('CASCADE') // Met à jour la clé étrangère si l'id change
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }
  async down() {
    this.schema.dropTable(this.tableName)
  }
}