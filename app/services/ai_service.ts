import type { MultipartFile } from '@adonisjs/core/bodyparser'
import type { Flashcard } from './ai/types.js'
import { DocumentFlashcardGenerator } from './ai/document_flashcard_generator.js'
import { ImageFlashcardGenerator } from './ai/image_flashcard_generator.js'

export default class AIService {
  constructor(
    private documentGenerator = new DocumentFlashcardGenerator(),
    private imageGenerator = new ImageFlashcardGenerator()
  ) {}

  // -------------------------------------------------------
  // DISPATCH : image ou fichier texte (PDF, DOCX, PPTX)
  // -------------------------------------------------------
  async generateFromFile(file: MultipartFile): Promise<Flashcard[]> {
    const ext = (file.extname ?? '').toLowerCase()

    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      return this.imageGenerator.generate(file)
    }
    if (['pdf', 'docx', 'pptx'].includes(ext)) {
      return this.documentGenerator.generate(file)
    }
    throw new Error(`Format non supporté : .${ext}`)
  }

  // -------------------------------------------------------
  // Rétrocompat : génération depuis une image
  // -------------------------------------------------------
  async generateFromImage(image: MultipartFile): Promise<Flashcard[]> {
    return this.imageGenerator.generate(image)
  }

  // -------------------------------------------------------
  // GÉNÉRATION depuis plusieurs fichiers mixtes
  // -------------------------------------------------------
  async generateFromFiles(
    files: MultipartFile[]
  ): Promise<{ cards: Flashcard[]; errors: string[] }> {
    const results = await Promise.allSettled(files.map((file) => this.generateFromFile(file)))

    const allCards: Flashcard[] = []
    const errors: string[] = []

    results.forEach((result, index) => {
      const fileName = files[index].clientName
      if (result.status === 'fulfilled') {
        allCards.push(...result.value)
      } else {
        const msg =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason ?? 'erreur inconnue')
        // eslint-disable-next-line no-console
        console.error(`❌ Fichier #${index + 1} échoué — "${fileName}" : ${msg}`)
        errors.push(`"${fileName}" : ${msg}`)
      }
    })

    // Dédoublonnage par question
    const seen = new Set<string>()
    const cards = allCards.filter((card) => {
      const key = card.question.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return { cards, errors }
  }

  // Rétrocompat : ancien nom utilisé dans le controller
  async generateFromImages(
    images: MultipartFile[]
  ): Promise<{ cards: Flashcard[]; errors: string[] }> {
    return this.generateFromFiles(images)
  }
}