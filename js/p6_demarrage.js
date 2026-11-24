// p6_demarrage - onglets (téléphone), connexion, chargement des données, premier affichage.
// v2 (24/11/2026) : connexion par prénom et code, vue équipe, remise à jour
// automatique, mode hors connexion avec la dernière copie gardée sur le téléphone.

function rendreOnglets() {
  const n = S.demandes.filter(d => !estInfo(d)).length;
  const ot = $('#o-trancher'), oa = $('#o-agenda');
  ot.innerHTML = ''; oa.innerHTML = '';
  ot.append(icone('liste'), estDeputee() ? 'Arbitrages' : 'Envois');
  if (estDeputee() && n) ot.append(el('span', { class: 'pastille' }, String(n)));
  oa.append(icone('agenda'), 'Agenda');
  ot.setAttribute('aria-selected', String(S.onglet === 'trancher'));
  oa.setAttribute('aria-selected', String(S.onglet === 'agenda'));
}
function choisirOnglet(o) {
  S.onglet = o;
  document.body.className = 'onglet-' + o + (estDeputee() ? '' : ' equipe');
  rendreOnglets();
  window.scrollTo(0, 0);
  if (o === 'agenda') placerBande(S.jourPos != null ? S.jourPos : S.jourSel, false);   // la bande n'a sa largeur qu'une fois visible
}
function estDeputee() { return !S.moi || S.moi.role === 'deputee'; }

function toutRendre() {
  if (!S.moi) return;
  $('#connexion').hidden = true;
  $('#app').hidden = false;
  document.body.classList.toggle('equipe', !estDeputee());
  // v4 (24/11/2026, JL : « \"Arbitrage\" plutot que \"a trancher\" ») ; date et
  // salutation retirées (JL : « tu n'a pas enlevé toute cette artie inutile »).
  // v6 (JL : « où est-ce qu'on voit les retours de Sophia ? ») : côté équipe, les réponses
  // sont sur les envois mêmes ; plus de lien « Réponses ».
  $('#btn-histo').textContent = 'Déjà arbitré';
  $('#btn-histo').hidden = !estDeputee();
  $('#titre-txt').textContent = estDeputee() ? 'Arbitrages' : 'Envois';
  $('#hors-ligne').hidden = !S.horsLigne;
  rendreAlerte();
  rendreListe();
  rendreAgenda();
  if (typeof rendreComposeur === 'function') rendreComposeur();
  if (S.ouverte) {
    const d = S.demandes.find(x => x.id === S.ouverte.id);
    if (d && !$('#fiche').hidden && $('#feuille').hidden) { S.ouverte = d; rendreFiche(d); }
  }
}

// ---------- Connexion ----------
function afficherConnexion() {
  $('#app').hidden = true;
  const c = $('#connexion');
  c.hidden = false;
  c.innerHTML = '';
  const nom = el('input', { id: 'c-nom', autocomplete: 'username', autocapitalize: 'words', placeholder: 'Ton prénom', 'aria-label': 'Prénom' });
  const code = el('input', { id: 'c-code', type: 'password', autocomplete: 'current-password', placeholder: 'Ton code', 'aria-label': 'Code' });
  const msg = el('p', { class: 'c-msg', role: 'alert' });
  const bouton = el('button', { class: 'c-entrer', type: 'submit' }, 'Entrer');
  const form = el('form', { class: 'c-boite', onsubmit: async (e) => {
    e.preventDefault();
    msg.textContent = ''; bouton.disabled = true; bouton.textContent = 'Un instant...';
    try {
      await SOURCE.connexion(nom.value.trim(), code.value);
      code.value = '';
      await SOURCE.recharger();
      ouvrirDepuisLien();
    } catch (err) {
      msg.textContent = err.message === 'hors-ligne' ? 'Pas de connexion internet.' : err.message;
    }
    bouton.disabled = false; bouton.textContent = 'Entrer';
  } }, [
    el('div', { class: 'c-logo' }, icone('paraphe')),
    el('h1', null, 'Paraphe'),
    el('p', { class: 'c-sous' }, 'Une seule fois sur ce téléphone.'),
    nom, code, msg, bouton,
  ]);
  c.append(form);
  setTimeout(() => nom.focus(), 50);
}

// ---------- Démarrage ----------
async function demarrer() {
  $('#o-trancher').addEventListener('click', () => choisirOnglet('trancher'));
  $('#o-agenda').addEventListener('click', () => choisirOnglet('agenda'));
  $('#btn-histo').addEventListener('click', ouvrirHisto);
  $('#voile').addEventListener('click', () => depiler());
  $('#voile-ecran').addEventListener('click', () => depiler(PILE.length));
  preparerAgenda();
  const pret = await SOURCE.demarrer();
  if (pret) ouvrirDepuisLien();
  window.addEventListener('hashchange', ouvrirDepuisLien);
  // Remise à jour quand l'appli revient au premier plan, et toutes les deux minutes.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.moi) SOURCE.recharger(); });
  setInterval(() => { if (!document.hidden && S.moi && $('#feuille').hidden) SOURCE.recharger(); }, 120000);
  // Les heures de l'agenda se remettent à jour chaque minute.
  setInterval(() => { if (S.moi && !S.ouverte) rendreAgenda(); }, 60000);
}
function eclairerEnvoi(id) {
  const c = $('#liste .carte[data-id="' + id + '"]');
  if (!c) return;
  c.scrollIntoView({ block: 'center' });
  c.classList.add('eclaire');
  setTimeout(() => c.classList.remove('eclaire'), 2400);
}
// Lien direct depuis une alerte : ...#d=<id> ouvre la demande.
function ouvrirDepuisLien() {
  const m = location.hash.match(/d=([\w-]+)/);
  if (!m || !S.moi) return;
  // v6 : côté équipe, l'alerte d'une réponse amène sur l'envoi, qui porte la réponse.
  if (!estDeputee()) { choisirOnglet('trancher'); eclairerEnvoi(m[1]); return; }
  if (S.demandes.some(x => x.id === m[1])) { choisirOnglet('trancher'); ouvrirArbitrage(m[1]); }   // v5 : la pièce s'ouvre directement
  else if (S.tranchees.some(x => x.demande.id === m[1])) ouvrirHisto();
}

