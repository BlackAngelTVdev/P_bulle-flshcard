import type { MultipartFile } from '@adonisjs/core/bodyparser'

export type Flashcard = { question: string; answer: string }

export type AiGenerationInput = {
  file: MultipartFile
  fileName: string
  ext: string
}
