import vine from '@vinejs/vine'
import { frMessages } from '#validators/messages'

// 1. On définit la liste des catégories autorisées (identique à ton HTML)
const categories = [
  'Anglais', 'Allemand', 'Espagnol', 'Italien', 'Français', 
  'Maths', 'Physique-Chimie', 'SVT', 'Informatique', 'Code de la route',
  'Philo', 'Histoire', 'Géo', 'SES', 'Droit', 'Économie',
  'Médecine', 'Culture G', 'Sport', 'Musique', 'Art', 'Autre'
]

/**
 * --- VALIDATEURS DECKS ---
 */
export const createDeckValidator = vine.compile(
  vine.object({
    name: vine.string().trim().unique({ table: 'decks', column: 'name' }),
    description: vine.string().trim().minLength(10),
    // On ajoute la validation de la catégorie
    category: vine.enum(categories) 
  })
)
createDeckValidator.messagesProvider = frMessages

export const updateDeckValidator = vine.compile(
  vine.object({
    id: vine.number(),
    name: vine.string().trim().unique({ 
      table: 'decks', 
      column: 'name',
      filter: (db, _value, field) => {
        db.whereNot('id', field.data.id)
      }
    }),
    description: vine.string().trim().minLength(10),
    // Idem pour l'update
    category: vine.enum(categories)
  })
)
updateDeckValidator.messagesProvider = frMessages