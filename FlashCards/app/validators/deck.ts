import vine from '@vinejs/vine'
import { frMessages } from '#validators/messages' // On utilise ton fichier centralisé

/**
 * --- VALIDATEURS DECKS ---
 */
export const createDeckValidator = vine.compile(
  vine.object({
    name: vine.string().trim().unique({ table: 'decks', column: 'name' }),
    description: vine.string().trim().minLength(10),
  })
)
createDeckValidator.messagesProvider = frMessages

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
updateDeckValidator.messagesProvider = frMessages