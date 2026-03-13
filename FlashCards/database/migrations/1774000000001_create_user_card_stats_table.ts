import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_card_stats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('deck_id').unsigned().notNullable().references('id').inTable('decks').onDelete('CASCADE')
      table.integer('card_id').unsigned().notNullable().references('id').inTable('cards').onDelete('CASCADE')
      table.integer('played_count').notNullable().defaultTo(0)
      table.integer('correct_count').notNullable().defaultTo(0)
      table.integer('wrong_count').notNullable().defaultTo(0)
      table.boolean('last_result').notNullable().defaultTo(false)
      table.timestamp('last_played_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['user_id', 'deck_id', 'card_id'])
      table.index(['user_id', 'deck_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
