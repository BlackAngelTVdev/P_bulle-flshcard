import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

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

  @column.dateTime()
  declare lastSeenAt: DateTime | null

  @column()
  declare sessionVersion: number

  canUseAiToday(): boolean {
    if (this.isAdmin) return true
    if (!this.lastAiRequestAt) return true
    const lastUse = this.lastAiRequestAt.toLocal()
    const now = DateTime.local()
    return !lastUse.hasSame(now, 'day')
  }

  aiResetTime(): DateTime {
    return DateTime.local().endOf('day')
  }
}
