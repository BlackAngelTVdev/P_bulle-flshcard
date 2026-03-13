import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

const prepareNumberArray = (value: unknown): string => {
  if (!Array.isArray(value)) return '[]'

  const normalized = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)

  return JSON.stringify(normalized)
}

const consumeNumberArray = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) return []

      return parsed.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
    } catch {
      return []
    }
  }

  return []
}

export default class GameSession extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare deckId: number

  @column()
  declare mode: string

  @column()
  declare totalCards: number

  @column()
  declare correctAnswers: number

  @column({
    prepare: prepareNumberArray,
    consume: consumeNumberArray,
  })
  declare playedCardIds: number[]

  @column({
    prepare: prepareNumberArray,
    consume: consumeNumberArray,
  })
  declare correctCardIds: number[]

  @column({
    prepare: prepareNumberArray,
    consume: consumeNumberArray,
  })
  declare wrongCardIds: number[]

  @column.dateTime()
  declare endedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
