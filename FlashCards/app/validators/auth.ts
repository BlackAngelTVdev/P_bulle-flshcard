import vine from '@vinejs/vine'
import { frMessages } from '#validators/messages' // On utilise ton fichier centralisé

export const registerValidator = vine.compile(
  vine.object({
    username: vine
      .string()
      .trim()
      .minLength(3)
      .unique(async (db, value) => {
        const user = await db.from('users').where('username', value).first()
        return !user
      }),
    email: vine
      .string()
      .email()
      .normalizeEmail()
      .unique(async (db, value) => {
        const user = await db.from('users').where('email', value).first()
        return !user
      }),
    password: vine.string().minLength(8).confirmed(),
  })
)
registerValidator.messagesProvider = frMessages

export const loginValidator = vine.compile(
  vine.object({
    uid: vine.string().trim(),
    password: vine.string(),
  })
)
loginValidator.messagesProvider = frMessages
