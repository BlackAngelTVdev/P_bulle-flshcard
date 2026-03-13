document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    if (!container) return;

    // 1. Setup des datas
    const cards = JSON.parse(container.dataset.cards);
    const mode = container.dataset.mode || 'basique';
    const deckId = container.dataset.deckId;
    const csrfToken = container.dataset.csrfToken;
    const gameSessionId = Number(container.dataset.gameSessionId || 0);

    let currentIndex = 0;
    let score = 0;
    let lives = 3;
    let timerInterval;
    let isTransitioning = false;
    const playedCardIds = [];
    const correctCardIds = [];
    const wrongCardIds = [];

    // 2. Éléments DOM (Vérifie bien que les IDs correspondent à ton .edge)
    const cardInner = document.getElementById('card-inner');
    const questionText = document.getElementById('question-text');
    const answerText = document.getElementById('answer-text');
    const scoreDisplay = document.getElementById('current-score');
    const livesDisplay = document.getElementById('lives-display');
    const timerBar = document.getElementById('timer-bar');
    const cardElement = document.getElementById('card-element');

    // 3. Flip de la carte au clic
    if (cardElement) {
        cardElement.addEventListener('click', (e) => {
            // On ne flip pas si on clique sur les boutons "Juste/Faux"
            if (!e.target.closest('.game-actions') && !isTransitioning) {
                cardInner.classList.toggle('is-flipped');
            }
        });
    }

    // 4. Logique de réponse (window. pour être accessible par le onclick du HTML)
    window.nextCard = (isCorrect) => {
        if (isTransitioning) return;
        if (currentIndex >= cards.length) return;
        
        clearInterval(timerInterval);
        isTransitioning = true;

        const currentCard = cards[currentIndex];
        if (currentCard && Number.isInteger(currentCard.id)) {
            playedCardIds.push(currentCard.id);
            if (isCorrect) {
                correctCardIds.push(currentCard.id);
            } else {
                wrongCardIds.push(currentCard.id);
            }
        }

        if (isCorrect) {
            score++;
            if (scoreDisplay) scoreDisplay.innerText = score;
        } else {
            if (mode === 'survie') {
                lives--;
                if (livesDisplay) livesDisplay.innerText = "❤️".repeat(lives);
                if (lives <= 0) {
                    showResults();
                    return;
                }
            }
        }

        currentIndex++;
        
        // On remet la carte sur le Recto avant de changer le texte
        cardInner.classList.remove('is-flipped');

        setTimeout(() => {
            isTransitioning = false;
            showCard();
        }, 300); 
    };

    // 5. Mode Chrono
    function startChrono() {
        if (!timerBar) return;
        
        let timeLeft = 10;
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';
        timerBar.offsetHeight; // Reflow
        timerBar.style.transition = 'width 10s linear';
        timerBar.style.width = '0%';

        timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                window.nextCard(false); 
            }
        }, 1000);
    }

    // 6. Affichage carte
    function showCard() {
        if (currentIndex < cards.length) {
            // On met à jour le texte
            questionText.innerText = cards[currentIndex].question;
            answerText.innerText = cards[currentIndex].answer;
            
            // Si mode chrono, on lance le décompte
            if (mode === 'chrono') startChrono();
        } else {
            showResults();
        }
    }

    // 7. Fin de game
    async function showResults() {
        clearInterval(timerInterval);
        if (!deckId) return;

        const payload = {
            gameSessionId,
            mode,
            score,
            total: cards.length,
            playedCardIds,
            correctCardIds,
            wrongCardIds,
        };

        let savedSessionId = gameSessionId;

        try {
            const response = await fetch(`/decks/${deckId}/finish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken || '',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.sessionId) {
                    savedSessionId = data.sessionId;
                }
            }
        } catch (error) {
            console.error('Impossible de sauvegarder la session de jeu.', error);
        }

        window.location.href = `/decks/${deckId}/result?score=${score}&total=${cards.length}&mode=${mode}&sessionId=${savedSessionId}`;
    }

    // LANCEMENT DU JEU
    showCard();
});