# Qui est-ce ? — Le jeu des objets

Un jeu de devinettes en français, pensé pour jouer à deux en classe, chacun sur son iPad.

**Jouer : https://raulmar0.github.io/qui-est-ce/**

Chaque élève lance une nouvelle partie : les 23 objets sont mélangés et une carte secrète est tirée indépendamment au hasard. Les élèves se posent des questions à l’oral et touchent les cartes pour éliminer des possibilités. « J’ai une idée ! » aide à formuler une proposition ; c’est le partenaire qui confirme la réponse.

- Interface et vocabulaire en français, illustrations originales créées avec Image Gen.
- Nouvelle partie, continuation, annulation et remise à zéro du plateau.
- Sauvegarde automatique du plateau, de la carte secrète et des objets éliminés dans le navigateur.
- Carte secrète cachée au départ, masquée après 12 secondes et quand on quitte l’onglet.
- Aide, exemples de questions, gestion du singulier et du pluriel.
- Mise en page adaptée à l’iPad en portrait et paysage, et aux téléphones.
- Aucune inscription, aucun serveur de jeu et aucun suivi publicitaire. Les appareils ne sont pas connectés entre eux : on joue en se parlant.

Pour continuer, utiliser le même appareil, le même navigateur et la même adresse. Effacer les données du navigateur efface la partie. Si le navigateur bloque la sauvegarde, le jeu reste utilisable tant que l’onglet reste ouvert et affiche un message explicite.

## Développement

Node.js 24 et npm.

```sh
npm ci
npm run dev
```

```sh
npm test
npx playwright install --with-deps chromium webkit
npm run test:e2e
npm run build
```

Application statique en HTML, CSS et JavaScript, construite avec Vite. Les images et les polices sont servies par le site. `base: './'` permet la publication dans un sous-répertoire GitHub Pages.

## Publication

Dans les paramètres du dépôt, configurer GitHub Pages avec **GitHub Actions** comme source. Chaque push sur `main` exécute les tests unitaires, les parcours navigateur Chromium et WebKit puis publie `dist/`. Voir la [documentation GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Images et polices

L’atlas des 23 objets est dans `public/assets/objects.png`. Les prompts de création et de correction sont conservés dans [docs/image-prompts.md](docs/image-prompts.md). Les noms et coordonnées se trouvent dans `src/items.js`. « Le casque » est illustré par un casque audio.

Les polices DM Sans et Fraunces sont distribuées sous la SIL Open Font License ; les licences sont dans `public/fonts/`.
