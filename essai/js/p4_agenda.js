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
    el('button', { onclick: () => ouvrirPiece(doc, e.docs) }, [icone(iconePiece(doc)), doc.titre || doc.nom || 'Document'])));
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
      col.appendChild(el('div', { class: 'journee' }, [e.titre, ' ', el('small', null, 'toute la journée' + (e.lieu ? ', ' + e.lieu : ''))]));
      return;
    }
    const encours = new Date(e.debut) <= t && t < new Date(e.fin);
    const passe = new Date(e.fin) <= t;
    col.appendChild(el('div', { class: 'evt' + (encours ? ' encours' : '') + (passe ? ' passe' : ''), 'data-id': e.id }, [
      el('div', { class: 'h' }, [heure(e.debut), el('small', null, heure(e.fin))]),
      el('div', { class: 'c' }, [
        encours ? el('div', { class: 'drapeau' }, 'En ce moment') : null,
        el('div', { class: 't' }, e.titre),
        e.lieu ? el('div', { class: 'l' }, e.lieu) : null,
        boutonsDocs(e),
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
  placerBande(S.jourSel, false);
}

function placerBande(k, doux) {
  const b = $('#bande'), w = largeurJour();
  if (!w) return;
  const x = (k - S.agPlage.de) * w;
  // Glissement doux pour un jour ou deux ; saut direct au-delà (« Aujourd'hui » depuis loin).
  if (doux && Math.abs(x - b.scrollLeft) > 3 * w) doux = false;
  if (doux && b.scrollTo) b.scrollTo({ left: x, behavior: 'smooth' });
  else { b.style.scrollSnapType = 'none'; b.scrollLeft = x; requestAnimationFrame(() => { b.style.scrollSnapType = ''; }); }
}

// Après chaque glissement : le jour affiché, et des jours en plus si l'on approche d'un bord.
let minuterieBande = null;
function suivreBande() {
  clearTimeout(minuterieBande);
  minuterieBande = setTimeout(() => {
    const b = $('#bande'), w = largeurJour();
    if (!w) return;
    S.jourSel = S.agPlage.de + Math.round(b.scrollLeft / w);
    rendreEnteteAgenda();
    if (S.jourSel - S.agPlage.de < 5) etendreAgenda(-1);
    else if (S.agPlage.a - S.jourSel < 7) etendreAgenda(1);
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
    el('button', { class: 'nav-jour', 'aria-label': 'Jour précédent', onclick: () => placerBande(S.jourSel - 1, true) }, icone('gauche')),
    el('button', { class: 'lien' + (S.jourSel === 0 ? ' discret' : ''), onclick: () => { S.jourSel = 0; placerBande(0, true); } }, "Aujourd'hui"),
    el('button', { class: 'nav-jour', 'aria-label': 'Jour suivant', onclick: () => placerBande(S.jourSel + 1, true) }, icone('droite')),
  );
}

function preparerAgenda() {
  const b = $('#bande');
  b.addEventListener('scroll', suivreBande, { passive: true });
  window.addEventListener('resize', () => placerBande(S.jourSel, false));
  rendreEnteteAgenda();
}
