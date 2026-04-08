const BULLET_MARKER_REGEX = /^\(\)\s*(.*)$/

export function formatCardTextForDisplay(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(BULLET_MARKER_REGEX)
      if (!match) return line

      const content = (match[1] || '').trim()
      return content ? `• ${content}` : '•'
    })
    .join('\n')
}