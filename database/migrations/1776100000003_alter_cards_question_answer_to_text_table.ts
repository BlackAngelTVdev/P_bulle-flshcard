import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cards'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('question').notNullable().alter()
      table.text('answer').notNullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('question').notNullable().alter()
      table.string('answer').notNullable().alter()
    })
  }
}
