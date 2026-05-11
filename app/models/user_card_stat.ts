import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class UserCardStat extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare deckId: number

  @column()
  declare cardId: number

  @column()
  declare playedCount: number

  @column()
  declare correctCount: number

  @column()
  declare wrongCount: number

  @column()
  declare lastResult: boolean

  @column.dateTime()
  declare lastPlayedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
