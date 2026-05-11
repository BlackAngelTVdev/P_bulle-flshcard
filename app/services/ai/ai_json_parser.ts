import type { Flashcard } from './types.js'

export class AiJsonParser {
  parseFlashcards(rawContent: string, fileName: string): Flashcard[] {
    let parsed: unknown

    const cleaned = rawContent
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // Fallback: le modèle renvoie parfois du texte + JSON, on tente d'extraire le premier bloc JSON
      const jsonCandidate = this.extractFirstJson(cleaned)
      if (!jsonCandidate) {
        // eslint-disable-next-line no-console
        console.error(`❌ JSON introuvable pour "${fileName}" :`, rawContent)
        throw new Error(`JSON invalide pour "${fileName}" : aucun objet/tableau JSON détecté`)
      }

      try {
        parsed = JSON.parse(jsonCandidate)
      } catch (err2: unknown) {
        const msg = err2 instanceof Error ? err2.message : String(err2)
        // eslint-disable-next-line no-console
        console.error(`❌ JSON invalide (fallback) pour "${fileName}" :`, jsonCandidate)
        throw new Error(`JSON invalide pour "${fileName}" : ${msg}`)
      }
    }

    let cards: Flashcard[] = []

    if (Array.isArray(parsed)) {
      cards = parsed as Flashcard[]
    } else if (parsed !== null && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (Array.isArray(obj.flashcards)) {
        cards = obj.flashcards as Flashcard[]
      } else if (Array.isArray(obj.cards)) {
        cards = obj.cards as Flashcard[]
      } else {
        for (const key in obj) {
          const val = obj[key]
          if (Array.isArray(val)) {
            cards = val as Flashcard[]
            break
          }
        }

        if (cards.length === 0) {
          throw new Error(`Format JSON inattendu pour "${fileName}"`)
        }
      }
    } else {
      throw new Error(`Format JSON inattendu pour "${fileName}"`)
    }

    return cards.filter(
      (card) =>
        card !== null &&
        typeof card === 'object' &&
        typeof card.question === 'string' &&
        typeof card.answer === 'string' &&
        card.question.trim() !== '' &&
        card.answer.trim() !== ''
    )
  }

  private extractFirstJson(text: string): string | null {
    // cherche le 1er objet ou tableau JSON et essaye de trouver la fermeture correspondante
    const firstBrace = text.indexOf('{')
    const firstBracket = text.indexOf('[')

    if (firstBrace === -1 && firstBracket === -1) return null

    const start =
      firstBrace === -1
        ? firstBracket
        : firstBracket === -1
          ? firstBrace
          : Math.min(firstBrace, firstBracket)

    const openChar = text[start]
    const closeChar = openChar === '{' ? '}' : ']'

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < text.length; i++) {
      const ch = text[i]

      if (inString) {
        if (escaped) {
          escaped = false
          continue
        }
        if (ch === '\\') {
          escaped = true
          continue
        }
        if (ch === '"') {
          inString = false
        }
        continue
      }

      if (ch === '"') {
        inString = true
        continue
      }

      if (ch === openChar) depth++
      if (ch === closeChar) depth--

      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }

    return null
  }
}
