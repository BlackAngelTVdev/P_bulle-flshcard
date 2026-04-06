import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'game_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('deck_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('decks')
        .onDelete('CASCADE')
      table.string('mode').notNullable().defaultTo('basique')
      table.integer('total_cards').notNullable().defaultTo(0)
      table.integer('correct_answers').notNullable().defaultTo(0)
      table.json('played_card_ids').notNullable()
      table.json('correct_card_ids').notNullable()
      table.json('wrong_card_ids').notNullable()
      table.timestamp('ended_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
