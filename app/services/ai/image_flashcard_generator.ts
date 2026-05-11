import env from '#start/env'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { promises as fs } from 'node:fs'
import Groq from 'groq-sdk'

import type { Flashcard } from './types.js'
import { AiJsonParser } from './ai_json_parser.js'

export class ImageFlashcardGenerator {
  private visionModels = [
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.2-11b-vision-preview',
  ]

  constructor(private parser = new AiJsonParser()) {}

  async generate(image: MultipartFile): Promise<Flashcard[]> {
    const apiKey = env.get('GROQ_API_KEY')
    if (!apiKey) throw new Error('Clé API Groq non configurée.')
    if (!image.tmpPath) throw new Error('Image manquante ou upload échoué.')

    let base64Image: string
    try {
      const imageData = await fs.readFile(image.tmpPath)
      base64Image = imageData.toString('base64')
      await fs.unlink(image.tmpPath).catch(() => {})
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Lecture image échouée : ${msg}`)
    }

    const contentType = (image.headers['content-type'] as string) || 'image/jpeg'
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
- PRÉCISION : Si le texte est manuscrit, fais une déduction logique basée sur le contexte.
- Réponse de max 255 caractères, Question de max 255 caractères.`

    let rawContent: string | null = null
    let lastError: unknown = null

    for (const modelName of this.visionModels) {
      try {
        const completion = await groq.chat.completions.create({
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
        rawContent = completion.choices[0]?.message?.content ?? null
        if (rawContent) {
          // eslint-disable-next-line no-console
          console.log(`✅ Succès avec ${modelName}`)
          break
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        // eslint-disable-next-line no-console
        console.warn(`⚠️ Échec avec ${modelName} : ${msg}. Tentative suivante...`)
        lastError = err
      }
    }

    if (!rawContent) {
      const lastMsg = lastError instanceof Error ? lastError.message : String(lastError)
      throw new Error(`Tous les modèles ont échoué pour "${image.clientName}". Dernier message : ${lastMsg}`)
    }

    return this.parser.parseFlashcards(rawContent, image.clientName)
  }
}
