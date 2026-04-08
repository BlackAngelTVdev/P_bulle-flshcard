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

    if (ext === 'pdf') {
      const uint8 = new Uint8Array(buffer)
      const { text } = await extractPdfText(uint8, { mergePages: true })
      return text
    }

    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }

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

    if (extractedText.trim().length < 10) {
      throw new Error(`Le fichier "${file.clientName}" semble vide ou illisible.`)
    }

    const truncated = extractedText.slice(0, 15000)

    const prompt = `Tu es un extracteur de données pédagogiques ultra-exhaustif. 
Ton objectif est de convertir TOUT le texte fourni en flashcards, sans omission d'informations importantes.

TEXTE SOURCE :
"""
${truncated}
"""

DIRECTIVES DE GÉNÉRATION :
- EXHAUSTIVITÉ TOTALE : Si le texte contient une liste de 100 mots, génère 100 flashcards. Ne résume pas.
- ADAPTATION : Le nombre de cartes doit correspondre strictement à la densité d'information du texte.
- LANGUES : Extrais chaque couple de vocabulaire. Question = Mot source, Réponse = Traduction.
- SCIENCES : Question = Concept/Théorème, Réponse = Définition/Formule précise.
- MÉTHODE : Analyse le texte segment par segment pour ne rien oublier.

RÈGLES DE FORMATAGE :
- Réponds EXCLUSIVEMENT avec du JSON brut.
- STRUCTURE : {"flashcards": [{"question": "...", "answer": "..."}]}
- CONTRAINTES : Question et Réponse doivent être claires et tenir sur 255 caractères max chacune.`

    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: this.textModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0, // Minimum pour une fidélité maximale aux données
      max_tokens: 8192, // Augmenté pour supporter plus de cartes en une seule réponse
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

    const prompt = `Tu es un expert en OCR (Reconnaissance Optique de Caractères) et en pédagogie.
Analyse cette image et convertis l'intégralité de son contenu en flashcards.

DIRECTIVE CRITIQUE POUR LES LISTES/TABLEAUX :
- Si l'image contient une liste de vocabulaire, un tableau de conjugaison ou des définitions, tu DOIS extraire CHAQUE LIGNE individuellement.
- NE FAIS PAS de sélection. Si tu vois 50 mots, tu génères 50 flashcards.
- Pour les tableaux : Question = En-tête + Mot de la ligne, Réponse = Valeur correspondante.

DOMAINES :
1. VOCABULAIRE : Question = Mot original, Réponse = Traduction/Définition.
2. SCHÉMAS : Question = Nom de l'élément pointé, Réponse = Fonction/Description.
3. FORMULES : Utilise LaTeX pour les symboles complexes.

RÈGLES DE SORTIE :
- JSON brut uniquement (pas de texte, pas de \`\`\`json).
- STRUCTURE : {"flashcards": [{"question": "...", "answer": "..."}]}
- QUANTITÉ : Illimitée. Génère autant de cartes que nécessaire pour couvrir 100% de l'image.
- Limite de 255 caractères par champ.`

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
          temperature: 0, 
          max_tokens: 4096,
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
      throw new Error(`Échec critique pour "${image.clientName}" : ${lastMsg}`)
    }

    return this.parseFlashcards(rawContent, image.clientName)
  }

  // -------------------------------------------------------
  // PARSE JSON → flashcards
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
      throw new Error(`L'IA a généré un format illisible pour "${fileName}".`)
    }

    let cards: Flashcard[] = []

    if (Array.isArray(parsed)) {
      cards = parsed as Flashcard[]
    } else if (parsed !== null && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      const potentialArray = obj.flashcards || obj.cards || Object.values(obj).find(Array.isArray)
      if (Array.isArray(potentialArray)) {
        cards = potentialArray as Flashcard[]
      } else {
        throw new Error(`Format JSON inattendu pour "${fileName}"`)
      }
    }

    return cards.filter(
      (card) =>
        card &&
        typeof card.question === 'string' &&
        typeof card.answer === 'string' &&
        card.question.trim().length > 0 &&
        card.answer.trim().length > 0
    )
  }

  // -------------------------------------------------------
  // GÉNÉRATION MULTI-FICHIERS
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
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason)
        errors.push(`"${fileName}" : ${msg}`)
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

  async generateFromImages(
    images: MultipartFile[]
  ): Promise<{ cards: Flashcard[]; errors: string[] }> {
    return this.generateFromFiles(images)
  }
}