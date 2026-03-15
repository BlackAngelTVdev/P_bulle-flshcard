// Recherche en temps réel sur la page home (filtrage côté client, sans rechargement)
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.search-bar input[name="q"]')
  const decksGrid = document.querySelector('.decks-grid')

  if (!searchInput || !decksGrid) return

  const parseSearchQuery = (rawValue) => {
    const normalizedValue = rawValue.toLowerCase().trim()

    if (!normalizedValue) {
      return { mode: 'empty', category: '', themes: [], generic: '' }
    }

    if (!normalizedValue.includes(',')) {
      return { mode: 'generic', category: '', themes: [], generic: normalizedValue }
    }

    const [rawCategory, ...rawThemes] = normalizedValue.split(',')

    return {
      mode: 'segmented',
      category: rawCategory.trim(),
      themes: rawThemes.map((part) => part.trim()).filter(Boolean),
      generic: '',
    }
  }

  searchInput.addEventListener('input', (e) => {
    const query = parseSearchQuery(e.target.value)

    // Récupérer tous les groupes de catégories
    const categoryGroups = document.querySelectorAll('.category-group')

    categoryGroups.forEach((group) => {
      const categoryLabel = group.querySelector('.category-label')
      const categoryName = categoryLabel ? categoryLabel.textContent.toLowerCase() : ''
      const deckCards = group.querySelectorAll('.deck-card')
      let visibleDecks = 0

      // Filtrer chaque deck dans cette catégorie
      deckCards.forEach((card) => {
        const deckTitle = card.querySelector('.deck-title').textContent.toLowerCase()
        const deckDescription = card.querySelector('.deck-description').textContent.toLowerCase()
        const deckContent = `${deckTitle} ${deckDescription}`

        const genericMatch =
          query.mode === 'generic' &&
          (deckTitle.includes(query.generic) ||
            deckDescription.includes(query.generic) ||
            categoryName.includes(query.generic))

        const categoryMatch = !query.category || categoryName.includes(query.category)
        const themeMatch =
          query.themes.length === 0 || query.themes.every((theme) => deckContent.includes(theme))

        // Sans virgule: recherche globale. Avec virgule: categorie, theme1, theme2...
        const matches =
          query.mode === 'empty' ||
          genericMatch ||
          (query.mode === 'segmented' && categoryMatch && themeMatch)

        if (matches) {
          card.style.display = ''
          visibleDecks++
        } else {
          card.style.display = 'none'
        }
      })

      // Masquer la catégorie entière si aucun deck n'est visible
      if (visibleDecks === 0) {
        group.style.display = 'none'
      } else {
        group.style.display = ''
        // Mettre à jour le compteur de decks
        const badge = group.querySelector('.badge-count')
        if (badge) {
          badge.textContent = `${visibleDecks} deck${visibleDecks > 1 ? 's' : ''}`
        }
      }
    })

    // Gérer l'affichage de l'empty state si besoin
    const hasVisibleGroups = Array.from(categoryGroups).some((g) => g.style.display !== 'none')
    let emptyState = document.querySelector('.empty-state')

    if (!hasVisibleGroups && query.mode !== 'empty') {
      if (!emptyState) {
        emptyState = document.createElement('div')
        emptyState.className = 'empty-state search-empty'
        emptyState.innerHTML = `
          <div class="empty-icon">🔍</div>
          <h2>Aucun deck trouve</h2>
          <p>Essaie par exemple categorie, theme</p>
        `
        decksGrid.appendChild(emptyState)
      }
      emptyState.style.display = ''
    } else if (emptyState && emptyState.classList.contains('search-empty')) {
      emptyState.style.display = 'none'
    }
  })
})
