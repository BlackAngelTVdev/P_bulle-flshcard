import env from '#start/env'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import fs from 'node:fs/promises'
import Groq from 'groq-sdk'
import mammoth from 'mammoth'
import { extractText as extractPdfText } from 'unpdf'
import AdmZip from 'adm-zip'

type Flashcard = { question: string; answer: string }

export default class AIService {
  private visionModels = [
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.2-11b-vision-preview',
  ]

  private textModel = 'llama-3.3-70b-versatile'

  // -------------------------------------------------------
  // DISPATCH : image ou fichier texte (PDF, DOCX, PPTX)
  // -------------------------------------------------------
  async generateFromFile(file: MultipartFile): Promise<Flashcard[]> {
    const ext = (file.extname ?? '').toLowerCase()

    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      return this.generateFromImage(file)
    }
    if (['pdf', 'docx', 'pptx'].includes(ext)) {
      return this.generateFromDocument(file)
    }
    throw new Error(`Format non supporté : .${ext}`)
  }

  // -------------------------------------------------------
  // EXTRACTION TEXTE selon le type de fichier
  // -------------------------------------------------------
  private async extractFileText(file: MultipartFile): Promise<string> {
    if (!file.tmpPath) throw new Error('Fichier manquant ou upload échoué.')

    const ext = (file.extname ?? '').toLowerCase()
    const buffer = await fs.readFile(file.tmpPath)
    await fs.unlink(file.tmpPath).catch(() => {})

    // ---- PDF ----
    if (ext === 'pdf') {
      const uint8 = new Uint8Array(buffer)
      const { text } = await extractPdfText(uint8, { mergePages: true })
      return text
    }

    // ---- DOCX ----
    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }

    // ---- PPTX ----
    if (ext === 'pptx') {
      const zip = new AdmZip(buffer)
      const entries = zip.getEntries()

      const slideEntries = entries
        .filter((e: AdmZip.IZipEntry) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .sort((a: AdmZip.IZipEntry, b: AdmZip.IZipEntry) => a.entryName.localeCompare(b.entryName))

      const parts: string[] = []
      for (const entry of slideEntries) {
        const xml = entry.getData().toString('utf-8')
        const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? []
        const slideText = matches.map((m: string) => m.replace(/<[^>]+>/g, '')).join(' ')
        if (slideText.trim()) parts.push(slideText.trim())
      }
      return parts.join('\n\n')
    }

    throw new Error(`Extraction impossible pour .${ext}`)
  }

  // -------------------------------------------------------
  // GÉNÉRATION depuis un document texte (PDF/DOCX/PPTX)
  // -------------------------------------------------------
  private async generateFromDocument(file: MultipartFile): Promise<Flashcard[]> {
    const apiKey = env.get('GROQ_API_KEY')
    if (!apiKey) throw new Error('Clé API Groq non configurée.')

    let extractedText: string
    try {
      extractedText = await this.extractFileText(file)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Extraction de "${file.clientName}" échouée : ${msg}`)
    }

    if (extractedText.trim().length < 20) {
      throw new Error(`Le fichier "${file.clientName}" semble vide ou illisible.`)
    }

    // Tronque à ~12 000 caractères pour rester dans le context window
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

RÈGLES DE FORMATAGE ABSOLUES :
- Réponds EXCLUSIVEMENT avec du JSON brut.
- INTERDIT : Markdown, backticks, texte d'introduction ou de conclusion.
- STRUCTURE : {"flashcards": [{"question": "...", "answer": "..."}]}
- QUANTITÉ : Entre 5 et 40 flashcards.
- Question de max 255 caractères, Réponse de max 255 caractères.`

    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: this.textModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
    })

    const rawContent = completion.choices[0]?.message?.content ?? null
    if (!rawContent) throw new Error(`Pas de réponse IA pour "${file.clientName}".`)

    return this.parseFlashcards(rawContent, file.clientName)
  }

  // -------------------------------------------------------
  // GÉNÉRATION depuis une image
  // -------------------------------------------------------
  async generateFromImage(image: MultipartFile): Promise<Flashcard[]> {
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
          console.log(`✅ Succès avec ${modelName}`)
          break
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`⚠️ Échec avec ${modelName} : ${msg}. Tentative suivante...`)
        lastError = err
      }
    }

    if (!rawContent) {
      const lastMsg = lastError instanceof Error ? lastError.message : String(lastError)
      throw new Error(
        `Tous les modèles ont échoué pour "${image.clientName}". Dernier message : ${lastMsg}`
      )
    }

    return this.parseFlashcards(rawContent, image.clientName)
  }

  // -------------------------------------------------------
  // PARSE JSON → flashcards (factorisé)
  // -------------------------------------------------------
  private parseFlashcards(rawContent: string, fileName: string): Flashcard[] {
    let parsed: unknown

    try {
      const cleaned = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ JSON invalide pour "${fileName}" :`, rawContent)
      throw new Error(`JSON invalide pour "${fileName}" : ${msg}`)
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
        const firstArray = Object.values(obj).find(Array.isArray)
        if (firstArray) {
          cards = firstArray as Flashcard[]
        } else {
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