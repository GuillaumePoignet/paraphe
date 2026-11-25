// p4_agenda - l'agenda, jour par jour, avec les documents rattachés.
// JL (23/11/2026) : « une deuxième zone, de l'autre côté, avec l'agenda, le
// calendrier des jours qui arrivent et des jours suivants, où elle pourrait avoir
// ces documents qui sont mis dans l'agenda, par exemple, si elle a une interview,
// les questions de l'interview, si elle a un rendez-vous, la note de rendez-vous
// qu'elle peut ouvrir au moment où elle fait le rendez-vous ».
//
// v5 (24/11/2026, JL, en vocal : « pas les heures ligne par ligne [...] juste des
// blocs, les uns après les autres » ; « quand on swipe [...] ça swipe de jour en
// jour. Et tu peux défiler indéfiniment de jour en jour » ; puis « c'est vraiment
// sur le fonctionnement de Swipe que je veux que tu reprennes. Sur le reste, c'était
// vraiment déjà très très bien ») : les jours sont posés côte à côte, une colonne
// par jour avec ses rendez-vous empilés tels qu'avant (heure, titre, lieu,
// documents) ; on glisse le doigt d'un jour à l'autre, sans fin vers le passé comme
// vers l'avenir ; les jours se chargent au fur et à mesure.
//
// v6 (25/11/2026, JL : « j'aime pas le truc de quand on swipe, ça décale vers le jour
// d'après. C'est pas smooth [...] ça glisse pas, ça bloque » ; arbitrage : « Totalement
// libre ») : plus aucun calage sur les jours ; la bande glisse avec l'élan du doigt et
// s'arrête où on la laisse. À la souris, on la tire de la même façon.
// JL : « sur ordinateur, ça prend pas tout l'écran [...] que ça puisse prendre bien
// l'écran pile » : à l'ordinateur, autant de jours que la largeur le permet, qui
// remplissent exactement la zone.

const PAS_AGENDA = 14;   // jours ajoutés d'un coup quand on approche d'un bord

function evenementsDuJour(decalage) {
  const j = ajouterJours(debutJour(maintenant()), decalage);
  return S.agenda
    .filter(e => ecartJours(e.debut, j) === 0 || (e.journee && new Date(e.debut) <= j && new Date(e.fin) > j))
    .sort((a, b) => (b.journee ? 1 : 0) - (a.journee ? 1 : 0) || new Date(a.debut) - new Date(b.debut));
}

function conflitAgenda(debut, fin) {
  const a = new Date(debut), b = new Date(fin);
  return S.agenda.find(e => !e.journee && new Date(e.debut) < b && new Date(e.fin) > a)
      || S.agenda.find(e => e.journee && ecartJours(e.debut, a) === 0) || null;
}

// Les rendez-vous reçus pour une plage remplacent ceux déjà gardés sur cette plage.
function fusionnerAgenda(liste, debut, fin) {
  const a = new Date(debut), b = new Date(fin);
  S.agenda = S.agenda.filter(e => !(new Date(e.debut) >= a && new Date(e.debut) < b)).concat(liste);
}

function boutonsDocs(e) {
  if (!e.docs || !e.docs.length) return null;
  return el('div', { class: 'docs' }, e.docs.map(doc =>
    el('button', { onclick: () => ouvrirPiece(doc, e.docs) }, [icone(iconePiece(doc)), el('span', null, doc.titre || doc.nom || 'Document')])));
}

function colonneJour(k) {
  const jour = ajouterJours(debutJour(maintenant()), k);
  const col = el('section', { class: 'jourcol' + (k === 0 ? ' auj' : ''), 'data-k': String(k) });
  col.appendChild(el('div', { class: 'titre-jour' }, k >= -1 && k <= 1 ? majuscule(nomJour(jour)) + ', ' + dateLongue(jour) : majuscule(dateLongue(jour))));
  if (k < S.agCouvert.de || k > S.agCouvert.a) { col.appendChild(el('div', { class: 'vide' }, 'Chargement...')); return col; }
  const evts = evenementsDuJour(k);
  if (!evts.length) { col.appendChild(el('div', { class: 'vide' }, 'Rien de prévu ce jour-là.')); return col; }
  const t = maintenant();
  evts.forEach(e => {
    if (e.journee) {
      col.appendChild(el('div', { class: 'journee', style: e.couleur ? { '--ev': e.couleur } : null }, [e.titre, ' ', el('small', null, 'toute la journée' + (e.lieu ? ', ' + e.lieu : ''))]));
      return;
    }
    const encours = new Date(e.debut) <= t && t < new Date(e.fin);
    const passe = new Date(e.fin) <= t;
    // v7 (25/11/2026, JL : « mettre les mêmes couleurs que ce qu'il y a sur l'agenda du cabinet », « sur le
    // côté un petit peu assez discret ») : un filet de la couleur du rendez-vous à gauche du bloc.
    col.appendChild(el('div', { class: 'evt' + (encours ? ' encours' : '') + (passe ? ' passe' : ''), 'data-id': e.id, style: e.couleur ? { '--ev': e.couleur } : null }, [
      el('div', { class: 'h' }, [heure(e.debut), el('small', null, heure(e.fin))]),
      el('div', { class: 'c' }, [
        encours ? el('div', { class: 'drapeau' }, 'En ce moment') : null,
        el('div', { class: 't' }, e.titre),
        e.lieu ? el('div', { class: 'l' }, e.lieu) : null,
        boutonsDocs(e),
        // v6 : l'équipe joint une note au rendez-vous ici (ou en y glissant le fichier).
        !estDeputee() && !passe ? el('button', { class: 'joindre', onclick: () => choisirPourRdv(e.id) }, [icone('trombone'), 'Joindre']) : null,
      ]),
    ]));
  });
  return col;
}

function largeurJour() {
  const c = $('#bande .jourcol');
  if (!c) return 0;
  const g = parseFloat(getComputedStyle($('#bande')).columnGap) || 0;
  return c.getBoundingClientRect().width + g;
}

// Redessine la bande des jours en gardant le jour affiché à gauche (S.jourSel).
function rendreAgenda() {
  const b = $('#bande');
  if (!b) return;
  b.innerHTML = '';
  for (let k = S.agPlage.de; k <= S.agPlage.a; k++) b.appendChild(colonneJour(k));
  joursVisibles();
  // v6 : la bande s'arrête n'importe où ; on la remet exactement au même endroit.
  placerBande(S.jourPos != null ? S.jourPos : S.jourSel, false);
}

function placerBande(k, doux) {
  const b = $('#bande'), w = largeurJour();
  if (!w) return;
  const x = (k - S.agPlage.de) * w;
  // Glissement doux pour un jour ou deux ; saut direct au-delà (« Aujourd'hui » depuis loin).
  if (doux && Math.abs(x - b.scrollLeft) > 3 * w) doux = false;
  if (doux && b.scrollTo) b.scrollTo({ left: x, behavior: 'smooth' });
  else b.scrollLeft = x;
}

function allerAuJour(k) { S.jourSel = k; S.jourPos = k; placerBande(k, true); }

// À l'ordinateur : nombre de jours visibles d'après la largeur (une colonne fait 220 px au moins).
function joursVisibles() {
  const b = $('#bande');
  if (!b || !grandEcran()) { if (b) b.style.removeProperty('--n'); return; }
  b.style.setProperty('--n', String(Math.max(2, Math.floor((b.clientWidth + 12) / 232))));
}

// À la souris : on attrape la bande et on la tire ; un clic reste un clic si l'on n'a pas bougé.
function tirerALaSouris(b) {
  let x0 = null, s0 = 0, bouge = false;
  b.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button')) return;
    x0 = e.clientX; s0 = b.scrollLeft; bouge = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (!bouge && Math.abs(dx) > 4) { bouge = true; b.classList.add('tiree'); }
    if (bouge) b.scrollLeft = s0 - dx;
  });
  window.addEventListener('pointerup', () => { x0 = null; b.classList.remove('tiree'); });
  b.addEventListener('click', (e) => { if (bouge) { e.stopPropagation(); e.preventDefault(); bouge = false; } }, true);
}

// Après chaque glissement : le jour affiché, et des jours en plus si l'on approche d'un bord.
let minuterieBande = null;
function suivreBande() {
  clearTimeout(minuterieBande);
  minuterieBande = setTimeout(() => {
    const b = $('#bande'), w = largeurJour();
    if (!w) return;
    S.jourPos = S.agPlage.de + b.scrollLeft / w;
    S.jourSel = Math.round(S.jourPos);
    rendreEnteteAgenda();
    if (S.jourSel - S.agPlage.de < 5) etendreAgenda(-1);
    else if (S.agPlage.a - S.jourSel < 14) etendreAgenda(1);
  }, 140);
}

async function etendreAgenda(sens) {
  if (S.agEtend) return;
  S.agEtend = true;
  const de = sens < 0 ? S.agPlage.de - PAS_AGENDA : S.agPlage.a + 1;
  if (sens < 0) S.agPlage.de -= PAS_AGENDA; else S.agPlage.a += PAS_AGENDA;
  rendreAgenda();
  try {
    if (de < S.agCouvert.de || de + PAS_AGENDA - 1 > S.agCouvert.a) {
      await SOURCE.chargerAgenda(ajouterJours(debutJour(maintenant()), de), PAS_AGENDA);
      S.agCouvert.de = Math.min(S.agCouvert.de, de);
      S.agCouvert.a = Math.max(S.agCouvert.a, de + PAS_AGENDA - 1);
      rendreAgenda();
    }
  } catch (e) { toast(e.message === 'hors-ligne' ? "Pas de connexion : ces jours de l'agenda ne sont pas chargés." : "L'agenda n'a pas pu se charger."); }
  S.agEtend = false;
}

function rendreEnteteAgenda() {
  const z = $('#agenda-nav');
  if (!z) return;
  z.innerHTML = '';
  z.append(
    el('button', { class: 'nav-jour', 'aria-label': 'Jour précédent', onclick: () => allerAuJour(Math.ceil((S.jourPos != null ? S.jourPos : S.jourSel) - 0.05) - 1) }, icone('gauche')),
    el('button', { class: 'lien' + (S.jourSel === 0 ? ' discret' : ''), onclick: () => allerAuJour(0) }, "Aujourd'hui"),
    el('button', { class: 'nav-jour', 'aria-label': 'Jour suivant', onclick: () => allerAuJour(Math.floor((S.jourPos != null ? S.jourPos : S.jourSel) + 0.05) + 1) }, icone('droite')),
  );
}

function preparerAgenda() {
  const b = $('#bande');
  b.addEventListener('scroll', suivreBande, { passive: true });
  tirerALaSouris(b);
  joursVisibles();
  window.addEventListener('resize', () => { joursVisibles(); placerBande(S.jourPos != null ? S.jourPos : S.jourSel, false); });
  rendreEnteteAgenda();
}
