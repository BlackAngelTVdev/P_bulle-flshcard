// app/abilities/main.ts
import { Bouncer } from '@adonisjs/bouncer'
import User from '#models/user'
import Deck from '#models/deck'

export const isDeckOwner = Bouncer.ability((user: User, deck: Deck) => {
  return user.id === deck.userId
})