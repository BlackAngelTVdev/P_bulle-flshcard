// On attend que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    if (!container) return;

    // Récupération des datas injectées par Edge
    const cards = JSON.parse(container.dataset.cards).sort(() => Math.random() - 0.5);
    const redirectUrl = container.dataset.redirectUrl;

    let currentIndex = 0;
    let score = 0;

    const cardElement = document.getElementById('card-element');
    const cardInner = document.getElementById('card-inner');
    const questionText = document.getElementById('question-text');
    const answerText = document.getElementById('answer-text');
    const scoreDisplay = document.getElementById('current-score');
    const totalDisplay = document.getElementById('total-cards');
    const resultScreen = document.getElementById('result-screen');
    const finalScoreText = document.getElementById('final-score');

    if (totalDisplay) totalDisplay.innerText = cards.length;

    // Logique de retournement
    cardElement.addEventListener('click', (e) => {
        if (!e.target.closest('.game-actions')) {
            cardInner.classList.toggle('is-flipped');
        }
    });

    // Fonctions globales attachées à l'objet window pour les onclick du HTML
    window.nextCard = (isCorrect) => {
        if (isCorrect) score++;
        if (scoreDisplay) scoreDisplay.innerText = score;
        currentIndex++;
        showCard();
    };

    function showCard() {
        if (currentIndex < cards.length) {
            cardInner.classList.remove('is-flipped');
            // Petit délai pour laisser l'animation de retour se faire
            setTimeout(() => {
                questionText.innerText = cards[currentIndex].question;
                answerText.innerText = cards[currentIndex].answer;
            }, 150);
        } else {
            showResults();
        }
    }

    function showResults() {
        const container = document.getElementById('game-container');
        const deckId = container.dataset.deckId; // Récupère l'ID qu'on vient d'ajouter

        // Vérification de sécu
        if (!deckId) {
            console.error("Deck ID introuvable !");
            return;
        }

        const url = `/decks/${deckId}/result?score=${score}&total=${cards.length}`;
        window.location.href = url;
    }

    // Lancement du jeu
    showCard();
});