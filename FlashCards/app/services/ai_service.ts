import env from '#start/env'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import fs from 'node:fs/promises'
import Groq from 'groq-sdk'

export default class AIService {
  // Liste des modèles Vision de Groq par ordre de priorité
  private visionModels = [
    'llama-3.2-90b-vision-preview',
    'llama-3.2-11b-vision-preview',
    'meta-llama/llama-4-maverick-17b-128e-instruct' // Ton modèle actuel
  ]

  async generateFromImage(image: MultipartFile): Promise<{ question: string; answer: string }[]> {
    const apiKey = env.get('GROQ_API_KEY')
    if (!apiKey) throw new Error('Clé API Groq non configurée.')
    if (!image.tmpPath) throw new Error('Image manquante ou upload échoué.')

    let base64Image: string
    try {
      const imageData = await fs.readFile(image.tmpPath)
      base64Image = imageData.toString('base64')
      // Sécurité : on supprime le fichier temp dès qu'on a le base64
      await fs.unlink(image.tmpPath).catch(() => { })
    } catch (readError) {
      throw new Error(`Lecture image échouée: ${readError.message}`)
    }

    const contentType = image.headers['content-type'] || 'image/jpeg'
    const imageUrl = `data:${contentType};base64,${base64Image}`
    const groq = new Groq({ apiKey })

    const prompt = `Tu es un assistant pédagogique expert en création de flashcards de haute précision.
Analyse l'image fournie et extrais les informations selon les directives par catégorie ci-dessous.

DIRECTIVES PAR CATÉGORIE :
1. LANGUES (Anglais, Allemand, Espagnol, Italien, Français) :
   - Extrais tout vocabulaire (Mot -> Traduction).
   - Pour la grammaire : Question = Règle/Contexte, Réponse = Application/Exemple.
   - Si c'est un tableau : 1 ligne = 1 flashcard.

2. SCIENCES & TECH (Maths, Physique-Chimie, SVT, Informatique) :
   - Maths/Physique : Question = Nom du théorème/formule ou énoncé de variable, Réponse = Formule LaTeX ou définition.
   - SVT/Médecine : Identifie les schémas (Organe -> Fonction) ou processus biologiques.
   - Informatique : Question = Fonction/Syntaxe, Réponse = Rôle/Code.

3. SCIENCES HUMAINES (Philo, Histoire, Géo, SES, Droit) :
   - Histoire : Question = Événement/Date, Réponse = Description/Importance.
   - Philo/SES : Question = Concept ou Auteur, Réponse = Définition ou Thèse principale.
   - Géo/Droit : Question = Terme technique ou Article de loi, Réponse = Définition ou Application.

4. CODE DE LA ROUTE & CULTURE G :
   - Priorise l'identification visuelle (ex: Panneau -> Signification, Priorité -> Règle).

RÈGLES DE FORMATAGE ABSOLUES :
- Réponds EXCLUSIVEMENT avec du JSON brut.
- INTERDIT : Markdown, backticks, ou texte d'introduction/conclusion.
- STRUCTURE : {"flashcards": [{"question": "...", "answer": "..."}]}
- COUVERTURE : Analyse l'image de haut en bas. Ne saute aucune ligne de tableau.
- QUANTITÉ : Entre 5 et 40 flashcards par image.
- PRÉCISION : Si le texte est manuscrit, fais une déduction logique basée sur le contexte de la catégorie.
- Réponse de max 255 caractères
- Question de mx 255 caractères`

    let rawContent: string | null = null
    let lastError: any = null

    // --- TEST AUTOMATIQUE DES MODÈLES ---
    for (const modelName of this.visionModels) {
      try {
        const chatCompletion = await groq.chat.completions.create({
          model: modelName,
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
        if (rawContent) {
          console.log(`✅ Succès avec ${modelName}`)
          break // On a une réponse, on sort de la boucle
        }
      } catch (err) {
        console.warn(`⚠️ Échec avec ${modelName}: ${err.message}. Tentative suivante...`)
        lastError = err
        continue // On passe au modèle suivant
      }
    }

    if (!rawContent) {
      throw new Error(`Tous les modèles ont échoué pour ${image.clientName}. Dernier message: ${lastError?.message}`)
    }

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

  // generateFromImages reste identique...
  async generateFromImages(
    images: MultipartFile[]
  ): Promise<{ cards: { question: string; answer: string }[]; errors: string[] }> {
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
