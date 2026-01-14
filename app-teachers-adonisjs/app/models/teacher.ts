import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Section from '#models/section'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
export default class Teacher extends BaseModel {
  @column({ isPrimary: true })
  declare id: number
  @column()
  declare gender: String
  @column()
  declare firstname: String
  @column()
  declare lastname: String
  @column()
  declare nickname: String
  @column()
  declare origine: String
  @column()
  declare sectionId: number // Colonne correspondant à la clé étrangère
  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section> // Relation vers le modèle Section
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}