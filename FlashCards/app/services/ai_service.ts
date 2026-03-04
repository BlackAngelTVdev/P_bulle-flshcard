import env from '#start/env'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import fs from 'node:fs/promises'
import Groq from 'groq-sdk'

export default class AIService {
  async generateFromImage(image: MultipartFile): Promise<{ question: string; answer: string }[]> {

    // --- Vérification de la clé API ---
    const apiKey = env.get('GROQ_API_KEY')
    if (!apiKey) {
      console.error('❌ [AIService] GROQ_API_KEY manquante dans le fichier .env !')
      throw new Error('Clé API Groq non configurée.')
    }



    if (!image.tmpPath) {
      console.error('❌ [AIService] tmpPath manquant — fichier non uploadé correctement.')
      throw new Error('Image manquante ou upload échoué.')
    }

    // --- Lecture et encodage base64 ---

    let base64Image: string
    try {
      const imageData = await fs.readFile(image.tmpPath)
      base64Image = imageData.toString('base64')

    } catch (readError) {
      console.error('❌ [AIService] Impossible de lire le fichier image:', readError)
      throw new Error(`Lecture image échouée: ${readError.message}`)
    }

    const contentType = image.headers['content-type'] || 'image/jpeg'
    const imageUrl = `data:${contentType};base64,${base64Image}`


    // --- Initialisation Groq ---
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
- Réponds UNIQUEMENT avec du JSON brut, rien d\'autre, zéro texte autour
- Interdit : blocs markdown, backticks, texte avant/après
- Format strict : {"flashcards": [{"question": "...", "answer": "..."}]}
- Couvre ABSOLUMENT TOUS les éléments visibles (chaque ligne du tableau !)
- Maximum 40 flashcards
- Ne saute aucune ligne d\'un tableau`

    let rawContent: string | null = null

    try {

      const startTime = Date.now()

      const chatCompletion = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      })

      const elapsed = Date.now() - startTime


      rawContent = chatCompletion.choices[0]?.message?.content ?? null


    } catch (groqError) {

      throw new Error(`Erreur API Groq: ${groqError.message}`)
    }

    if (!rawContent) {
      console.error('❌ [AIService] La réponse de Groq est vide.')
      throw new Error('Réponse vide reçue de Groq.')
    }

    // --- Parsing JSON ---
    console.log('\n🔍 [AIService] Parsing de la réponse JSON...')
    let parsed: any

    try {
      // Nettoyage au cas où le modèle entoure le JSON de backticks markdown
      const cleaned = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()

      if (cleaned !== rawContent) {

      }

      parsed = JSON.parse(cleaned)

    } catch (parseError) {
      console.error('❌ [AIService] Échec du parsing JSON:', parseError.message)
      console.error('Contenu non parsable:', rawContent)
      throw new Error(`Réponse Groq non valide (JSON invalide): ${parseError.message}`)
    }

    // --- Extraction du tableau de cartes ---
    let cards: { question: string; answer: string }[] = []

    if (Array.isArray(parsed)) {

      cards = parsed
    } else if (Array.isArray(parsed.flashcards)) {

      cards = parsed.flashcards
    } else if (Array.isArray(parsed.cards)) {

      cards = parsed.cards
    } else {
      // Dernier recours : on cherche le premier tableau dans l'objet
      const firstArray = Object.entries(parsed).find(([key, val]) => Array.isArray(val))
      if (firstArray) {
        console.warn(`⚠️ [AIService] Tableau trouvé sous une clé inattendue: "${firstArray[0]}"`)
        cards = firstArray[1] as any[]
      } else {
        console.error('❌ [AIService] Aucun tableau de cartes trouvé dans la réponse.')
        console.error('Objet parsé:', JSON.stringify(parsed, null, 2))
        throw new Error('Format de réponse Groq inattendu — aucun tableau trouvé.')
      }
    }

    // --- Validation des cartes ---
    const validCards = cards.filter((card, index) => {
      const isValid = card && typeof card.question === 'string' && typeof card.answer === 'string'
        && card.question.trim() !== '' && card.answer.trim() !== ''
      if (!isValid) {
        console.warn(`⚠️ [AIService] Carte #${index} invalide ignorée:`, card)
      }
      return isValid
    })


    validCards.forEach((card, i) => {
      console.log(`   [${i + 1}] Q: ${card.question.substring(0, 60)}...`)
    })
    console.log('========================================\n')

    return validCards
  }
}