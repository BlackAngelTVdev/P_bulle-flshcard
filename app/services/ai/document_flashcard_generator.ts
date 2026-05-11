import env from '#start/env'
import Groq from 'groq-sdk'
import type { MultipartFile } from '@adonisjs/core/bodyparser'

import type { Flashcard } from './types.js'
import { AiJsonParser } from './ai_json_parser.js'
import { DocumentTextExtractor } from './document_text_extractor.js'

export class DocumentFlashcardGenerator {
  constructor(
    private textModel = 'llama-3.3-70b-versatile',
    private extractor = new DocumentTextExtractor(),
    private parser = new AiJsonParser()
  ) {}

  async generate(file: MultipartFile): Promise<Flashcard[]> {
    const apiKey = env.get('GROQ_API_KEY')
    if (!apiKey) throw new Error('Clé API Groq non configurée.')

    let extractedText: string
    try {
      extractedText = await this.extractor.extract(file)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Extraction de "${file.clientName}" échouée : ${msg}`)
    }

    if (extractedText.trim().length < 20) {
      throw new Error(`Le fichier "${file.clientName}" semble vide ou illisible.`)
    }

    const truncated = extractedText.slice(0, 12000)

    const prompt = `Tu es un assistant pédagogique expert en création de flashcards de haute précision.
Analyse le texte fourni et génère des flashcards selon les directives ci-dessous.

TEXTE À ANALYSER :
"""
${truncated}
"""

DIRECTIVES PAR CATÉGORIE :
1. LANGUES (Anglais, Allemand, Espagnol, Italien, Français) :
   - Extrais tout vocabulaire (Mot -> Traduction).
   - Pour la grammaire : Question = Règle/Contexte, Réponse = Application/Exemple.

2. SCIENCES & TECH (Maths, Physique-Chimie, SVT, Informatique) :
   - Maths/Physique : Question = Nom du théorème/formule, Réponse = Formule ou définition.
   - SVT/Médecine : Identifie les processus biologiques.
   - Informatique : Question = Fonction/Syntaxe, Réponse = Rôle/Code.

3. SCIENCES HUMAINES (Philo, Histoire, Géo, SES, Droit) :
   - Histoire : Question = Événement/Date, Réponse = Description/Importance.
   - Philo/SES : Question = Concept ou Auteur, Réponse = Définition ou Thèse.
   - Droit : Question = Terme technique ou Article, Réponse = Définition ou Application.

RÈGLES DE FORMATAGE ABSOLUES (À RESPECTER) :
- Réponds UNIQUEMENT par un JSON valide (aucun texte avant/après).
- INTERDIT : Markdown, backticks, titres, listes, explications.
- La réponse DOIT commencer par un objet/tableau JSON et contenir la clé "flashcards".
- STRUCTURE : {"flashcards": [{"question": "...", "answer": "..."}]}.
- QUANTITÉ : Entre 5 et 40 flashcards.
- Question max 255 caractères, réponse max 255 caractères.`

    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: this.textModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
    })

    let rawContent = completion.choices[0]?.message?.content ?? null
    if (!rawContent) throw new Error(`Pas de réponse IA pour "${file.clientName}".`)

    // 1) tentative directe
    try {
      return this.parser.parseFlashcards(rawContent, file.clientName)
    } catch {
      // 2) repair: convertit la réponse en JSON strict
      const repairPrompt = `Convertis EXACTEMENT le contenu ci-dessous en JSON valide, sans aucun texte autour.

RÈGLES:
- Réponds uniquement avec du JSON.
- Structure obligatoire: {"flashcards":[{"question":"...","answer":"..."}]}
- 5 à 40 flashcards.
- question/réponse max 255 caractères.

CONTENU À CONVERTIR:
"""
${rawContent}
"""`

      const repaired = await groq.chat.completions.create({
        model: this.textModel,
        messages: [{ role: 'user', content: repairPrompt }],
        temperature: 0,
        max_tokens: 4096,
      })

      rawContent = repaired.choices[0]?.message?.content ?? null
      if (!rawContent) {
        throw new Error(`Pas de réponse IA (repair) pour "${file.clientName}".`)
      }

      return this.parser.parseFlashcards(rawContent, file.clientName)
    }
  }
}
