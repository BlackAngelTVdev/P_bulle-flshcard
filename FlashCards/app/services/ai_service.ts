import env from '#start/env'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import fs from 'node:fs/promises'
import Groq from 'groq-sdk'

export default class AIService {

  // -------------------------------------------------------
  // Traite UNE image → retourne ses flashcards
  // -------------------------------------------------------
  async generateFromImage(image: MultipartFile): Promise<{ question: string; answer: string }[]> {
    const apiKey = env.get('GROQ_API_KEY')
    if (!apiKey) throw new Error('Clé API Groq non configurée.')
    if (!image.tmpPath) throw new Error('Image manquante ou upload échoué.')



    let base64Image: string
    try {
      const imageData = await fs.readFile(image.tmpPath)
      base64Image = imageData.toString('base64')
    } catch (readError) {
      throw new Error(`Lecture image échouée: ${readError.message}`)
    }

    const contentType = image.headers['content-type'] || 'image/jpeg'
    const imageUrl = `data:${contentType};base64,${base64Image}`
    const groq = new Groq({ apiKey })
    const model = 'meta-llama/llama-4-maverick-17b-128e-instruct'

    const prompt = `Tu es un assistant pédagogique expert en création de flashcards. Analyse cette image et génère des flashcards adaptées à son contenu.

DÉTECTE AUTOMATIQUEMENT le type de contenu :

1. TABLEAU DE VOCABULAIRE (ex: colonne FR/EN, terme/définition, mot/traduction)
   → Une flashcard PAR LIGNE du tableau, sans exception
   → Question = contenu colonne gauche, Réponse = contenu colonne droite
   → Si tableau FR/EN : Q: mot français, A: traduction anglaise (et inversement)
   → Lis CHAQUE ligne, même si le tableau est long

2. COURS / TEXTE / SCHÉMA
   → Flashcards sur les concepts clés, dates, formules, définitions
   → Question = "Qu'est-ce que X ?" ou "À quoi sert Y ?"

3. FORMULES / MATHS
   → Une flashcard par formule ou théorème
   → Question = nom/contexte, Réponse = formule exacte

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec du JSON brut, rien d'autre, zéro texte autour
- Interdit : blocs markdown, backticks, texte avant/après
- Format strict : {"flashcards": [{"question": "...", "answer": "..."}]}
- Couvre ABSOLUMENT TOUS les éléments visibles (chaque ligne du tableau !)
- Maximum 40 flashcards par image
- Ne saute aucune ligne d'un tableau`

    let rawContent: string | null = null

    try {
      const startTime = Date.now()
      const chatCompletion = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      })

      rawContent = chatCompletion.choices[0]?.message?.content ?? null

    } catch (groqError) {
      throw new Error(`Erreur API Groq (${image.clientName}): ${groqError.message}`)
    }

    if (!rawContent) throw new Error(`Réponse vide pour l'image ${image.clientName}`)

    let parsed: any
    try {
      const cleaned = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch (parseError) {
      console.error(`❌ [AIService] JSON invalide pour ${image.clientName}:`, rawContent)
      throw new Error(`JSON invalide pour ${image.clientName}: ${parseError.message}`)
    }

    let cards: { question: string; answer: string }[] = []
    if (Array.isArray(parsed)) {
      cards = parsed
    } else if (Array.isArray(parsed.flashcards)) {
      cards = parsed.flashcards
    } else if (Array.isArray(parsed.cards)) {
      cards = parsed.cards
    } else {
      const firstArray = Object.entries(parsed).find(([_, val]) => Array.isArray(val))
      if (firstArray) {
        cards = firstArray[1] as any[]
      } else {
        throw new Error(`Format inattendu pour ${image.clientName}`)
      }
    }

    return cards.filter(
      (card) =>
        card &&
        typeof card.question === 'string' &&
        typeof card.answer === 'string' &&
        card.question.trim() !== '' &&
        card.answer.trim() !== ''
    )
  }

  // -------------------------------------------------------
  // Traite PLUSIEURS images en parallèle → fusionne tout
  // -------------------------------------------------------
  async generateFromImages(
    images: MultipartFile[]
  ): Promise<{ cards: { question: string; answer: string }[]; errors: string[] }> {


    // Promise.allSettled = si une image échoue, les autres continuent quand même
    const results = await Promise.allSettled(
      images.map((image) => this.generateFromImage(image))
    )

    const allCards: { question: string; answer: string }[] = []
    const errors: string[] = []

    results.forEach((result, index) => {
      const imageName = images[index].clientName
      if (result.status === 'fulfilled') {
       
        allCards.push(...result.value)
      } else {
        const msg = `"${imageName}" : ${result.reason?.message ?? 'erreur inconnue'}`
        console.error(`❌ Image #${index + 1} échouée — ${msg}`)
        errors.push(msg)
      }
    })

    // Dédoublonnage : retire les cartes avec la même question
    const seen = new Set<string>()
    const cards = allCards.filter((card) => {
      const key = card.question.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })



    return { cards, errors }
  }
}