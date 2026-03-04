import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare username: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare isAdmin: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare lastAiRequestAt: DateTime | null

  // -------------------------------------------------------
  // Vérifie si l'utilisateur peut utiliser l'IA aujourd'hui
  // Les admins peuvent toujours utiliser l'IA
  // -------------------------------------------------------
  canUseAiToday(): boolean {
    if (this.isAdmin) return true
    if (!this.lastAiRequestAt) return true

    const lastUse = this.lastAiRequestAt.toLocal()
    const now = DateTime.local()

    // Même jour calendaire = bloqué
    return !lastUse.hasSame(now, 'day')
  }

  // Retourne l'heure de réinitialisation (minuit prochain)
  aiResetTime(): DateTime {
    return DateTime.local().endOf('day')
  }
}