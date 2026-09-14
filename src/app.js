import "./styles.css";
import { ITEMS, ITEM_BY_ID, questionFor } from "./items.js";
import {
  newGame,
  toggleItem,
  undo,
  resetBoard,
  readGame,
  saveGame,
} from "./game.js";

const app = document.querySelector("#app");
const dialog = document.querySelector("#dialog");
const announcer = document.querySelector("#announcer");
const toastElement = document.querySelector("#toast");
let storage;
try {
  storage = window.localStorage;
} catch {
  /* The game also works for this visit. */
}
const loaded = readGame(storage);
let game = loaded.game;
let storageAvailable = loaded.available;
let screen = "home";
let secretVisible = false;
let secretTimer;
let toastTimer;
let returnFocus;

const paths = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .4c0 1.8-2.5 1.9-2.5 3.6m0 3h.01"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="m3 3 18 18M10.6 5.1A12 12 0 0 1 12 5c6.4 0 10 7 10 7a19 19 0 0 1-3.4 4.2M6.5 6.5A20 20 0 0 0 2 12s3.6 7 10 7a12 12 0 0 0 5.5-1.5M10 10a3 3 0 0 0 4 4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  undo: '<path d="M3 10h11a7 7 0 0 1 0 14" transform="translate(0 -5)"/><path d="m7 1-4 4 4 4" transform="translate(0 0)"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1.5 7M3 4v6h6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-9.5A8.5 8.5 0 0 1 10.5 4h2A8.5 8.5 0 0 1 21 11.5Z"/><path d="M7 10h9M7 14h6"/>',
  users:
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 4v2"/>',
  cards:
    '<rect x="7" y="4" width="13" height="17" rx="3"/><path d="M4 18 2 6a3 3 0 0 1 2-3l9-1"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  sound:
    '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
};

function icon(name, className = "") {
  return `<svg class="icon ${className}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
}

function artwork(item, className = "") {
  // A few illustrations need an optical offset so neighboring artwork never peeks in.
  const crop = item.crop ?? {
    x: (item.index % 6) * 256,
    y: Math.floor(item.index / 6) * 256,
    size: 256,
  };
  const x = (crop.x / (1536 - crop.size)) * 100;
  const y = (crop.y / (1024 - crop.size)) * 100;
  return `<span class="object-art ${className}" aria-hidden="true" style="--sprite-x:${x}%;--sprite-y:${y}%;background-size:${(1536 / crop.size) * 100}% ${(1024 / crop.size) * 100}%"></span>`;
}

function header(isGame = false) {
  return `<header class="site-header">
    <button class="brand" data-action="home" aria-label="Qui est-ce ? — Accueil">
      <span class="brand-mark" aria-hidden="true"><span>?</span></span>
      <span class="brand-type">Qui est-ce <span class="brand-question">?</span><small>LE JEU DES OBJETS</small></span>
    </button>
    <nav aria-label="Navigation principale">
      ${isGame ? '<button class="text-button home-link" data-action="home">' + icon("back") + "<span>Accueil</span></button>" : '<span class="language-tag"><span class="french-flag" aria-hidden="true"></span> En français</span>'}
      <button class="text-button rules-link" data-action="rules">${icon("help")}<span>Les règles</span></button>
    </nav>
  </header>`;
}

function homeCard(id, className) {
  const item = ITEM_BY_ID[id];
  return `<div class="demo-card ${className}">${artwork(item)}<span>${item.name}</span></div>`;
}

function renderHome() {
  screen = "home";
  hideSecret();
  const remaining = game ? ITEMS.length - game.eliminated.length : 0;
  app.innerHTML = `${header()}
    <main id="main" class="home-main" tabindex="-1">
      <section class="hero" aria-labelledby="home-title">
        <div class="hero-copy">
          <div class="eyebrow"><span class="little-star" aria-hidden="true">✳</span> UN JEU À DEUX, EN FRANÇAIS</div>
          <h1 id="home-title">Un objet secret.<br /><em>À toi de jouer.</em></h1>
          <p class="hero-description">Pose les bonnes questions, élimine les objets<br class="desktop-break" /> et découvre le secret de ton partenaire !</p>
          <div class="home-actions">
            <button class="button button-primary" data-action="new">Nouvelle partie ${icon("arrow")}</button>
            <button class="button button-secondary" data-action="continue" ${game ? "" : "disabled"}>${icon("play")} Continuer</button>
          </div>
          <p class="save-hint">${game ? icon("check") + ` Une partie t’attend · ${remaining} objet${remaining === 1 ? "" : "s"} restant${remaining === 1 ? "" : "s"}` : icon("lock") + " Ta partie se garde ici, pour la prochaine fois."}</p>
          ${storageAvailable ? "" : '<p class="storage-warning">La sauvegarde est indisponible dans ce navigateur. Garde cet onglet ouvert pour continuer ta partie.</p>'}
          <div class="hero-meta"><span>${icon("cards")} 23 objets</span><span>${icon("users")} 2 joueurs</span><span>${icon("chat")} 100 % français</span></div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="visual-orbit"></div>
          <span class="doodle doodle-one">✳</span><span class="doodle doodle-two">✦</span>
          <div class="speech-bubble">Est-ce que ça roule ?<span>Oui !</span></div>
          ${homeCard("velo", "demo-bicycle")}
          ${homeCard("sac-a-dos", "demo-backpack")}
          ${homeCard("lunettes", "demo-glasses")}
          <div class="demo-card demo-secret"><span class="mini-star">✧</span><span class="secret-question">?</span><span>TOP SECRET</span></div>
          <span class="hand-note">À toi de le découvrir <svg viewBox="0 0 74 48" fill="none"><path d="M2 3C10 35 42 42 68 20m-19 2 20-3-3 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </div>
      </section>
      <section class="how-it-works" aria-labelledby="how-title">
        <div class="section-label"><span class="line"></span><h2 id="how-title">LE PRINCIPE ? C’EST TOUT SIMPLE.</h2><span class="line"></span></div>
        <div class="steps">
          <article class="step"><span class="step-number step-blue">01</span><div><h3>Garde ton secret</h3><p>Chacun reçoit un objet au hasard.<br />Ne le montre pas à ton partenaire !</p></div></article>
          <article class="step"><span class="step-number step-coral">02</span><div><h3>À vous les questions</h3><p>Posez une question à tour de rôle.<br />On répond seulement par oui ou non.</p></div></article>
          <article class="step"><span class="step-number step-green">03</span><div><h3>Trouve le bon objet</h3><p>Touche les cartes pour les éliminer.<br />Un dernier objet ? Fais ta proposition !</p></div></article>
        </div>
      </section>
    </main>
    <footer class="home-footer"><span>Un peu de français, beaucoup de curiosité.</span><span>Fait pour jouer ensemble <span class="footer-flower" aria-hidden="true">✳</span></span></footer>`;
}

function boardCard(id) {
  const item = ITEM_BY_ID[id];
  const eliminated = game.eliminated.includes(id);
  return `<button class="object-card ${eliminated ? "is-eliminated" : ""}" data-object="${id}" aria-label="${item.name}" aria-pressed="${eliminated}" aria-describedby="board-instruction">
    <span class="card-illustration">${artwork(item)}<span class="cross-mark" aria-hidden="true"></span></span>
    <span class="object-name">${item.name}</span><span class="card-status" aria-hidden="true">${eliminated ? "Éliminé" : "Éliminer"}</span>
  </button>`;
}

function renderGame() {
  if (!game) return renderHome();
  screen = "game";
  app.innerHTML = `${header(true)}
    <main id="main" class="game-main" tabindex="-1">
      <div class="game-heading"><div><div class="eyebrow">OBSERVE. QUESTIONNE. DEVINE.</div><h1>À toi de mener l’enquête<span class="heading-dot">.</span></h1><p id="board-instruction">Touche un objet pour l’éliminer. Touche-le à nouveau pour le rétablir.</p></div><span id="saved-status" class="saved-status"></span></div>
      <div class="play-layout">
        <section class="board-section" aria-labelledby="board-title">
          <div class="board-toolbar"><div class="board-title-wrap"><h2 id="board-title">Mon plateau</h2><span id="remaining" class="count-badge" aria-live="polite"></span></div><div class="board-tools"><button class="text-button" data-action="undo" title="Annuler la dernière action">${icon("undo")}<span>Annuler</span></button><button class="icon-button" data-action="reset" aria-label="Rétablir tous les objets" title="Rétablir tous les objets">${icon("reset")}</button></div></div>
          <div class="object-grid" aria-label="Les 23 objets du plateau">${game.board.map(boardCard).join("")}<div class="board-note"><span>?</span><p>Lequel cache<br />ton partenaire ?</p></div></div>
          <div id="board-message" class="board-message" aria-live="polite"></div>
        </section>
        <aside class="game-sidebar" aria-label="Ma carte et mes questions">
          <section class="secret-panel" aria-labelledby="secret-title"><div class="panel-eyebrow">${icon("lock")} RIEN QUE POUR TOI</div><h2 id="secret-title">Ma carte secrète</h2><p>Ton partenaire doit la deviner.</p><div id="secret-slot"></div><p class="secret-caption">Un petit coup d’œil, puis on la cache !</p></section>
          <section class="questions-panel"><span class="question-icon">${icon("chat")}</span><h2>Un peu d’inspiration ?</h2><p>« Est-ce que ça roule ? »</p><p>« Est-ce qu’on l’utilise en classe ? »</p><p>« Est-ce que c’est électronique ? »</p><button class="text-button" data-action="questions">D’autres questions ${icon("arrow")}</button></section>
          <button class="button guess-button" data-action="guess">${icon("spark")} J’ai une idée !</button>
          <button class="text-button new-round" data-action="new">${icon("reset")} Nouvelle partie</button>
        </aside>
      </div>
      <div class="game-footer"><span>${icon("users")} Chacun son iPad, chacun son secret.</span><span>Écoute bien les réponses de ton partenaire !</span></div>
    </main>`;
  renderSecret();
  updateBoard();
}

function save() {
  const wasAvailable = storageAvailable;
  storageAvailable = saveGame(game, storage);
  if (!storageAvailable && wasAvailable)
    toast("La sauvegarde est indisponible. Garde cet onglet ouvert.");
  updateSaveStatus();
}

function updateSaveStatus() {
  const status = document.querySelector("#saved-status");
  if (status) {
    status.classList.toggle("save-unavailable", !storageAvailable);
    status.innerHTML = storageAvailable
      ? icon("check") + " Partie sauvegardée"
      : "Sauvegarde indisponible : garde cet onglet ouvert";
  }
}

function updateBoard() {
  if (screen !== "game") return;
  document.querySelectorAll("[data-object]").forEach((card) => {
    const eliminated = game.eliminated.includes(card.dataset.object);
    card.classList.toggle("is-eliminated", eliminated);
    card.setAttribute("aria-pressed", String(eliminated));
    card.querySelector(".card-status").textContent = eliminated
      ? "Éliminé"
      : "Éliminer";
  });
  const remaining = game.board.filter((id) => !game.eliminated.includes(id));
  document.querySelector("#remaining").textContent =
    `${remaining.length} / ${ITEMS.length}`;
  document.querySelector('[data-action="undo"]').disabled =
    !game.history.length;
  document.querySelector('[data-action="reset"]').disabled =
    !game.eliminated.length;
  document.querySelector(".guess-button").disabled = !remaining.length;
  const message = document.querySelector("#board-message");
  if (remaining.length === 0) {
    message.innerHTML = `${icon("help")}<p>Plus d’objets ? Une réponse t’a peut-être échappé. Rétablis une carte ou <button class="inline-button" data-action="reset">recommence le plateau</button>.</p>`;
    message.className = "board-message is-warning";
  } else if (remaining.length === 1) {
    message.innerHTML = `${icon("spark")}<p>Il ne reste qu’un objet ! <button class="inline-button" data-action="guess">Fais ta proposition.</button></p>`;
    message.className = "board-message is-ready";
  } else {
    message.innerHTML = `${icon("chat")}<p>À tour de rôle, posez une question. La réponse : <strong>oui</strong> ou <strong>non</strong> !</p>`;
    message.className = "board-message";
  }
  updateSaveStatus();
}

function renderSecret() {
  const slot = document.querySelector("#secret-slot");
  if (!slot || !game) return;
  const focused = slot.contains(document.activeElement);
  const item = ITEM_BY_ID[game.secretId];
  slot.innerHTML = secretVisible
    ? `<div class="secret-front">${artwork(item)}<strong>${item.name}</strong><span>CHUT… C’EST TON SECRET !</span></div><button class="button secret-toggle is-shown" data-action="secret" aria-expanded="true">${icon("eyeOff")} Cacher ma carte</button>`
    : `<button class="secret-back" data-action="secret" aria-label="Voir ma carte secrète" aria-expanded="false"><span class="secret-corner">✧</span><span class="secret-question">?</span><span class="secret-bottom-star">✧</span><span class="secret-back-label">TOP SECRET</span></button><button class="button secret-toggle" data-action="secret" aria-expanded="false">${icon("eye")} Voir ma carte</button>`;
  if (focused)
    slot.querySelector(".secret-toggle").focus({ preventScroll: true });
}

function hideSecret() {
  clearTimeout(secretTimer);
  if (secretVisible) {
    secretVisible = false;
    renderSecret();
  }
}

function toggleSecret() {
  clearTimeout(secretTimer);
  secretVisible = !secretVisible;
  renderSecret();
  if (secretVisible) secretTimer = setTimeout(hideSecret, 12000);
}

function toast(message) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.hidden = false;
  toastTimer = setTimeout(() => {
    toastElement.hidden = true;
  }, 4500);
}

function focusMain() {
  document.querySelector("#main").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function startGame() {
  hideSecret();
  game = newGame();
  save();
  closeDialog();
  renderGame();
  focusMain();
  toast(
    "C’est parti ! Découvre ta carte secrète, puis pose ta première question.",
  );
}

function openDialog(content, className = "") {
  hideSecret();
  if (!dialog.open) returnFocus = document.activeElement;
  dialog.className = className;
  dialog.innerHTML = `<button class="icon-button dialog-close" data-action="close" aria-label="Fermer">${icon("close")}</button>${content}`;
  if (!dialog.open) dialog.showModal();
}

function closeDialog() {
  if (dialog.open) dialog.close();
}

function showRules() {
  openDialog(
    `<span class="dialog-kicker">À DEUX, C’EST MIEUX</span><h2 id="dialog-title">Comment jouer ?</h2><p class="dialog-intro">Installe-toi face à ton partenaire. Chacun ouvre le jeu sur son iPad et lance une nouvelle partie.</p><ol class="rules-list"><li><span>01</span><div><h3>Découvre ta carte secrète</h3><p>Un objet est tiré au hasard pour toi. Regarde-le, puis cache-le : ton partenaire doit le deviner.</p></div></li><li><span>02</span><div><h3>Pose une question en français</h3><p>À tour de rôle, posez une question sur l’objet de l’autre. Répondez seulement par « oui » ou « non ».</p></div></li><li><span>03</span><div><h3>Élimine les objets</h3><p>Sur ton plateau, touche les objets qui ne correspondent pas à la réponse. Une erreur ? Touche encore la carte pour la rétablir.</p></div></li><li><span>04</span><div><h3>Fais ta proposition !</h3><p>Tu penses avoir trouvé ? Appuie sur « J’ai une idée ! » et demande à ton partenaire de confirmer.</p></div></li></ol><div class="dialog-note">${icon("cards")} Le plateau est mélangé pour chacun. Tous les joueurs ont les mêmes 23 objets ; vos cartes secrètes peuvent parfois être identiques.</div><p class="rules-save">Tu fais une pause ? « Continuer » reprend ta partie sur ce même iPad et dans ce même navigateur.</p><button class="button button-primary full-width" data-action="close">J’ai compris ${icon("check")}</button>`,
    "rules-dialog",
  );
}

function showQuestions() {
  openDialog(
    `<span class="dialog-kicker">UN COUP DE POUCE</span><h2 id="dialog-title">À toi de poser la question.</h2><p class="dialog-intro">Choisis une question qui t’aide à éliminer plusieurs objets.</p><div class="question-groups"><section><h3>${icon("cards")} L’utilisation</h3><p>Est-ce qu’on l’utilise en classe ?</p><p>Est-ce que c’est pour écrire ?</p><p>Est-ce que c’est pour faire du sport ?</p><p>Est-ce qu’on peut le porter ?</p></section><section><h3>${icon("eye")} L’apparence</h3><p>Est-ce que ça roule ?</p><p>Est-ce qu’il y a du bleu ?</p><p>Est-ce que c’est en bois ?</p><p>Est-ce que ça tient dans une trousse ?</p></section><section><h3>${icon("spark")} La catégorie</h3><p>Est-ce que c’est électronique ?</p><p>Est-ce que c’est un meuble ?</p></section></div><div class="dialog-note">${icon("chat")} Pour répondre : « Oui ! » ou « Non ! »</div><button class="button button-primary full-width" data-action="close">À moi de jouer ${icon("arrow")}</button>`,
  );
}

function showGuess() {
  const candidates = game.board.filter((id) => !game.eliminated.includes(id));
  if (candidates.length === 1) return confirmGuess(candidates[0]);
  openDialog(
    `<span class="dialog-kicker">LE MOMENT DE VÉRITÉ</span><h2 id="dialog-title">Tu as une petite idée ?</h2><p class="dialog-intro">Choisis l’objet que tu penses avoir deviné, puis demande à ton partenaire.</p><div class="guess-grid">${candidates.map((id) => `<button class="guess-option" data-guess="${id}">${artwork(ITEM_BY_ID[id])}<span>${ITEM_BY_ID[id].name}</span></button>`).join("")}</div>`,
    "guess-dialog",
  );
}

function confirmGuess(id) {
  const item = ITEM_BY_ID[id];
  openDialog(
    `<span class="dialog-kicker">DEMANDE À TON PARTENAIRE</span><h2 id="dialog-title" class="guess-question">« ${questionFor(item)} »</h2><div class="chosen-object">${artwork(item)}<strong>${item.name}</strong></div><p class="dialog-intro centered">Que répond ton partenaire ?</p><div class="dialog-actions"><button class="button button-secondary" data-action="wrong">Non, pas encore</button><button class="button button-primary" data-action="win">Oui, c’est ça ! ${icon("spark")}</button></div>`,
  );
}

function celebrate() {
  openDialog(
    `<div class="celebration" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}<span>✳</span></div><span class="dialog-kicker">BIEN JOUÉ !</span><h2 id="dialog-title">Mystère résolu.</h2><p class="dialog-intro">Bravo, tu as trouvé l’objet de ton partenaire !<br />Et si vous échangiez les rôles ?</p><button class="button button-primary full-width" data-action="start">Encore une partie ${icon("arrow")}</button><button class="text-button celebration-return" data-action="close">Revenir à mon plateau</button>`,
    "win-dialog",
  );
}

document.addEventListener("click", (event) => {
  const object = event.target.closest("[data-object]");
  if (object && game) {
    game = toggleItem(game, object.dataset.object);
    save();
    updateBoard();
    announcer.textContent = `${ITEM_BY_ID[object.dataset.object].name} : ${game.eliminated.includes(object.dataset.object) ? "éliminé" : "rétabli"}.`;
    return;
  }
  const guess = event.target.closest("[data-guess]");
  if (guess) return confirmGuess(guess.dataset.guess);
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case "home":
      closeDialog();
      renderHome();
      focusMain();
      break;
    case "new":
      if (game)
        openDialog(
          `<span class="dialog-kicker">ON REJOUE ?</span><h2 id="dialog-title">Une nouvelle enquête ?</h2><p class="dialog-intro">Ta partie actuelle sera remplacée. Tu recevras un nouvel objet au hasard et ton plateau sera mélangé.</p><div class="dialog-actions"><button class="button button-secondary" data-action="close">Garder ma partie</button><button class="button button-primary" data-action="start">C’est parti ${icon("arrow")}</button></div>`,
        );
      else startGame();
      break;
    case "start":
      startGame();
      break;
    case "continue":
      if (game) {
        hideSecret();
        renderGame();
        focusMain();
      }
      break;
    case "rules":
      showRules();
      break;
    case "questions":
      showQuestions();
      break;
    case "close":
      closeDialog();
      break;
    case "secret":
      toggleSecret();
      break;
    case "undo":
      game = undo(game);
      save();
      updateBoard();
      announcer.textContent = "Dernière action annulée.";
      break;
    case "reset":
      openDialog(
        `<span class="dialog-kicker">UN NOUVEAU REGARD</span><h2 id="dialog-title">Rétablir les objets ?</h2><p class="dialog-intro">Les 23 objets seront à nouveau visibles. Ta carte secrète et l’ordre du plateau restent les mêmes.</p><div class="dialog-actions"><button class="button button-secondary" data-action="close">Annuler</button><button class="button button-primary" data-action="confirm-reset">Tout rétablir ${icon("reset")}</button></div>`,
      );
      break;
    case "confirm-reset":
      game = resetBoard(game);
      save();
      updateBoard();
      closeDialog();
      toast("Tous les objets sont rétablis. Ton secret est toujours le même.");
      break;
    case "guess":
      showGuess();
      break;
    case "wrong":
      closeDialog();
      toast("L’enquête continue ! Pose une autre question à ton partenaire.");
      break;
    case "win":
      celebrate();
      break;
  }
});

dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    closeDialog();
});
dialog.addEventListener("close", () => {
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) hideSecret();
});
window.addEventListener("blur", hideSecret);
window.addEventListener("pagehide", hideSecret);

renderHome();
