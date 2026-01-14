import { BaseSchema } from '@adonisjs/lucid/schema'
export default class extends BaseSchema {
  protected tableName = 'sections'
  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // La seule ligne que nous devons ajouter à cette migration
      // Nom de la section
      table.string('name').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }
  async down() {
    this.schema.dropTable(this.tableName)
  }
}