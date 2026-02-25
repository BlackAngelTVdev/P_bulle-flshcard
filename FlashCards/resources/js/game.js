document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    if (!container) return;

    // 1. Setup des datas
    const cards = JSON.parse(container.dataset.cards).sort(() => Math.random() - 0.5);
    const mode = container.dataset.mode || 'basique';
    const deckId = container.dataset.deckId;

    let currentIndex = 0;
    let score = 0;
    let lives = 3;
    let timeLeft = 10;
    let timerInterval;
    let isTransitioning = false; // Sécurité anti-spam

    // 2. Éléments DOM
    const cardInner = document.getElementById('card-inner');
    const questionText = document.getElementById('question-text');
    const answerText = document.getElementById('answer-text');
    const scoreDisplay = document.getElementById('current-score');
    const livesDisplay = document.getElementById('lives-display');
    const timerBar = document.getElementById('timer-bar');

    // 3. Flip de la carte
    document.getElementById('card-element').addEventListener('click', (e) => {
        if (!e.target.closest('.game-actions') && !isTransitioning) {
            cardInner.classList.toggle('is-flipped');
        }
    });

    // 4. Logique de réponse
    window.nextCard = (isCorrect) => {
        if (isTransitioning) return; // Empêche de cliquer 10 fois pendant l'anim
        
        clearInterval(timerInterval);
        isTransitioning = true;

        if (isCorrect) {
            score++;
            if (scoreDisplay) scoreDisplay.innerText = score;
        } else if (mode === 'survie') {
            lives--;
            if (livesDisplay) livesDisplay.innerText = "❤️".repeat(lives);
            if (lives <= 0) return showResults();
        }

        currentIndex++;
        
        // Petit délai pour que l'utilisateur voit sa validation avant que la carte change
        setTimeout(() => {
            isTransitioning = false;
            showCard();
        }, 300);
    };

    // 5. Mode Chrono
    function startChrono() {
        timeLeft = 10;
        if (timerBar) {
            timerBar.style.transition = 'none'; // Reset immédiat
            timerBar.style.width = '100%';
            // Force le reflow pour que la transition de 10s s'applique après le reset
            timerBar.offsetHeight; 
            timerBar.style.transition = 'width 10s linear';
            timerBar.style.width = '0%';
        }

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
            cardInner.classList.remove('is-flipped');
            
            setTimeout(() => {
                questionText.innerText = cards[currentIndex].question;
                answerText.innerText = cards[currentIndex].answer;
                if (mode === 'chrono') startChrono();
            }, 150);
        } else {
            showResults();
        }
    }

    // 7. Fin de game
    function showResults() {
        clearInterval(timerInterval);
        if (!deckId) return;
        window.location.href = `/decks/${deckId}/result?score=${score}&total=${cards.length}&mode=${mode}`;
    }

    showCard();
});