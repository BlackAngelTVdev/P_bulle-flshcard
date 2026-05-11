import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { promises as fs } from 'node:fs'
import * as mammoth from 'mammoth'
import { extractText as extractPdfText } from 'unpdf'
import { createRequire } from 'node:module'

const requireCjs = createRequire(process.cwd() + '/')
const AdmZip: any = requireCjs('adm-zip')

export class DocumentTextExtractor {
  async extract(file: MultipartFile): Promise<string> {
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
        .filter((e: any) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .sort((a: any, b: any) => a.entryName.localeCompare(b.entryName))

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
}
