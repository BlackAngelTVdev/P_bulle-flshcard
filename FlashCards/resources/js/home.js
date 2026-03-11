// Recherche en temps réel sur la page home (filtrage côté client, sans rechargement)
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.search-bar input[name="q"]')
  
  if (!searchInput) return

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim()
    
    // Récupérer tous les groupes de catégories
    const categoryGroups = document.querySelectorAll('.category-group')
    
    categoryGroups.forEach(group => {
      const categoryName = group.querySelector('.category-summary span:first-child').textContent.toLowerCase()
      const deckCards = group.querySelectorAll('.deck-card')
      let visibleDecks = 0
      
      // Filtrer chaque deck dans cette catégorie
      deckCards.forEach(card => {
        const deckTitle = card.querySelector('.deck-title').textContent.toLowerCase()
        const deckDescription = card.querySelector('.deck-description').textContent.toLowerCase()
        
        // Vérifier si le deck ou la catégorie correspond à la recherche
        const matches = query === '' || 
                       deckTitle.includes(query) || 
                       deckDescription.includes(query) ||
                       categoryName.includes(query)
        
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
    const hasVisibleGroups = Array.from(categoryGroups).some(g => g.style.display !== 'none')
    let emptyState = document.querySelector('.empty-state')
    
    if (!hasVisibleGroups && query !== '') {
      if (!emptyState) {
        emptyState = document.createElement('div')
        emptyState.className = 'empty-state search-empty'
        emptyState.innerHTML = `
          <div class="empty-icon">🔍</div>
          <h2>Aucun deck trouvé</h2>
          <p>Essaie avec d'autres mots-clés</p>
        `
        document.querySelector('.decks-grid').appendChild(emptyState)
      }
      emptyState.style.display = ''
    } else if (emptyState && emptyState.classList.contains('search-empty')) {
      emptyState.style.display = 'none'
    }
  })
})
