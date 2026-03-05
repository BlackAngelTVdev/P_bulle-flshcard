# 🚀 Flash Dam's
![Stars](https://img.shields.io/github/stars/BlackAngelTVdev/P_bulle-flshcard?style=for-the-badge&color=yellow)
![Commits](https://img.shields.io/github/commit-activity/m/BlackAngelTVdev/P_bulle-flshcard?style=for-the-badge&color=blue)
![Issues](https://img.shields.io/github/issues/BlackAngelTVdev/P_bulle-flshcard?style=for-the-badge&color=orange)
![Forks](https://img.shields.io/github/forks/BlackAngelTVdev/P_bulle-flshcard?style=for-the-badge&color=808080)
![Last Commit](https://img.shields.io/github/last-commit/BlackAngelTVdev/P_bulle-flshcard?style=for-the-badge&color=blue)

**Transformez vos cours, tableaux et schémas en flashcards intelligentes instantanément grâce à l'IA.**

---

## 🧐 Aperçu
Flash Dam's simplifie la révision en automatisant la création de flashcards. En combinant la puissance d'**AdonisJS** et l'inférence ultra-rapide de **Groq (Llama 3.2 Vision)**, l'application est capable d'analyser n'importe quel support pédagogique visuel.

---

## ✨ Fonctionnalités

- 📸 **Scan Intelligent (OCR + IA)** : Upload de photos de cours, captures d'écran ou schémas.
- 🔄 **Système de Redondance (Failover)** : Bascule automatique entre plusieurs modèles (Llama-3.2-90b, 11b, Maverick) en cas de surcharge de l'API.
- 🧠 **Détection de Contenu** : 
  - **Langues** : Création de listes de vocabulaire et grammaire.
  - **Sciences** : Extraction de formules complexes (LaTeX) et définitions.
  - **Humaines** : Synthèse de concepts clés, dates et thèses.
- 🗂 **Gestion Intelligente** : Dédoublonnage automatique des questions et filtrage par catégories personnalisées.
- ⚡ **Performance** : Traitement asynchrone pour ne pas bloquer l'interface utilisateur.

---

## 🛠 Tech Stack

| Technologie | Usage |
| :--- | :--- |
| ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) | Logique backend & typage sécurisé |
| ![AdonisJS](https://img.shields.io/badge/AdonisJS-220052?style=for-the-badge&logo=adonisjs&logoColor=white) | Framework Backend (Node.js) |
| ![Groq](https://img.shields.io/badge/Groq-f55036?style=for-the-badge&logo=ai&logoColor=white) | Inférence IA (Llama 3.2 Vision) |
| ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white) | Base de données relationnelle |
| ![Edge](https://img.shields.io/badge/Edge-5A45FF?style=for-the-badge&logo=edge&logoColor=white) | Moteur de template |

---

## 🚀 Installation & Lancement

1. **Cloner le projet**
   ```bash
   git clone [https://github.com/BlackAngelTVdev/P_bulle-flshcard.git](https://github.com/BlackAngelTVdev/P_bulle-flshcard.git)
   cd P_bulle-flshcard

2. **Installation et Configuration**
   Installez les dépendances, copiez et renommez le fichier d'environnement, puis générez la clé (une version sans serveur SMTP est disponnible sur la branche 27-demo):
   ```bash
   npm install
   cp .env.example .env
   node ace generate:key
3. **Migration et ajout de données dans la base**
    ```
    node ace migration:fresh --seed
    ```
4. *API*
   Pour l'api de Groq c'est une api gratuit disponnible ![ICI](https://groq.com/), il vous suffit de créé un compte et de génrer une clef pour la collé dans le ```.env```
5. **Lancer l'application**
   ```
   npm run dev
   ```

## 📖 Utilisation

Une fois le serveur lancé, vous pouvez vous connecter avec les identifiants par défaut :

| Compte | Identifiant | Mot de passe |
| :--- | :--- | :--- |
| **Administrateur** | `Damien` | `admin1234` |
| **Administrateur** | `DamienDev` | `password123` |
| **Normal (pas de perm)** | `EtudiantSolide`| `password123`|

si vous voulez modifier le compte par defaut il faut aller dans ```database/seeders/user_seeder.ts``` puis modifier les users par defaut
  ```js

import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        username: 'Damien',
        email: 'dami.scoot3@gmail.com',
        password: 'admin1234',
        isAdmin: true
      },
      {
        username: 'EtudiantSolide',
        email: 'etudiant@test.com',
        password: 'password123',
      },
    ])
  }
}

  ```
et dans ```database/seeders/main_seeder.ts```
```js
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DeckFactory } from '#database/factories/deck_factory'
import { CardFactory } from '#database/factories/card_factory'
import User from '#models/user' // Import indispensable

export default class extends BaseSeeder {
  async run() {
    // 1. D'ABORD : Créer ou trouver l'user 1 (sinon les decks vont crash)
    const user = await User.firstOrCreate(
      { id: 1 }, 
      { 
        username: 'DamienDev',
        email: 'damien@etml.ch',
        password: 'password123' 
      }
    )

    // 2. ENSUITE : Créer les decks liés à cet user
    // On utilise .merge({ userId: user.id }) pour chaque deck
    const decks = await DeckFactory
      .merge({ userId: user.id }) 
      .createMany(5)

    for (const deck of decks) {
      const nbCards = Math.floor(Math.random() * 50) + 50
      
      await CardFactory
        .merge({ deckId: deck.id }) // Ici, on lie la carte au deck (le deck sait déjà à quel user il appartient)
        .createMany(nbCards)
    }

    // 3. Tes cartes spécifiques
    await CardFactory.createMany([
      { deckId: decks[0].id, question: 'Capitale de la France ?', answer: 'Paris' },
      { deckId: decks[0].id, question: 'Vitesse de la lumière ?', answer: '299 792 458 m/s' },
      { deckId: decks[0].id, question: 'Seeder de salopard ?', answer: 'Affirmatif.' }
    ])
  }
}
```
---

## 💡 Des idées ?
Toutes les idées sont les bienvenues ! Que ce soit pour une petite amélioration, une suggestion de fonctionnalité ou un simple retour d'expérience, n'hésite pas à t'exprimer. Ce projet grandit grâce à la communauté et il n'y a pas de "mauvaise" proposition.

Si tu as une idée, une question ou que tu as repéré un comportement étrange, tu peux ouvrir une **Issue** directement ici :
👉 **[Créer une nouvelle Issue](https://github.com/BlackAngelTVdev/P_bulle-flshcard/issues/new?template=feature_request.md)**

> [!TIP]
> Avant de créer une issue, vérifie si une discussion similaire n'est pas déjà ouverte !

---


## 🤝 Contribution
1. Forkez le projet
2. Créez votre branche (git checkout -b feature/AmazingFeature)
3. Commit (git commit -m 'Add some AmazingFeature')
4. Push (git push origin feature/AmazingFeature)
5. Ouvrez une Pull Request

## 👤 Auteur

- **BlackAngelTVdev**
![Follow](https://img.shields.io/github/followers/BlackAngelTVdev?label=Follow%20Me&style=social)
---
## 📄 Licence

Ce projet est sous licence :
![GitHub License](https://img.shields.io/github/license/BlackAngelTVdev/Je-donne-ou-je-prete?style=flat-square&color=blue)
