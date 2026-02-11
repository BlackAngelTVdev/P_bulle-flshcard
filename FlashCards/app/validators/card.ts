import vine from '@vinejs/vine'

export const createCardValidator = vine.compile(
  vine.object({
    question: vine.string().trim().minLength(3),
    answer: vine.string().trim().minLength(1),
    deckId: vine.number(),
  })
)
export const updateCardValidator = vine.compile(
  vine.object({
    question: vine.string().trim().minLength(3).maxLength(255),
    answer: vine.string().trim().minLength(1).maxLength(1000)
  })
)