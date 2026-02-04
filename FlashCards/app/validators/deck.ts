import vine from '@vinejs/vine'

/**
 * Validateur pour le Store
 */
export const createDeckValidator = vine.compile(
  vine.object({
    name: vine.string().trim().unique({ table: 'decks', column: 'name' }),
    description: vine.string().trim().minLength(10),
  })
)





export const updateDeckValidator = vine.compile(
  vine.object({
    id: vine.number(),
    name: vine.string().trim().unique({ 
      table: 'decks', 
      column: 'name',
      filter: (db, value, field) => {
        db.whereNot('id', field.data.id)
      }
    }),
    description: vine.string().trim().minLength(10),
  })
)
