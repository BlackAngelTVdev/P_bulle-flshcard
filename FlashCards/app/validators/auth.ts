import vine from '@vinejs/vine'

/**
 * Validateur pour l'inscription (Register)
 */
export const registerValidator = vine.compile(
  vine.object({
    username: vine.string().trim().minLength(3).unique(async (db, value) => {
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

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string(),
  })
)