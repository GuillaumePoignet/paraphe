// p8_alertes - alertes sur le téléphone (v2, 24/11/2026).
// JL (23/11/2026) : « Comment fait on pour que ça lui envoi des notifs genre comme
// telegram ? » ; arbitrage : notifications de l'appli, envoyées par Firebase.
// Sur iPhone, l'appli doit d'abord être sur l'écran d'accueil : on le lui explique
// en trois étapes au lieu d'un message d'erreur.

const CLE_ALERTES = 'adecider.alertes';
function alertesPossibles() {
  return SOURCE.mode === 'serveur' && !!(CFG.firebase && CFG.vapid) && 'serviceWorker' in navigator && 'Notification' in window;
}
function surIphone() { return /iPhone|iPad|iPod/.test(navigator.userAgent); }
function horsEcranAccueil() {
  return !(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
}

// v4 (24/11/2026, JL : invitation « Activer » remplacée par une petite cloche
// discrète en haut). Point rose : alertes pas encore activées sur cet appareil.
function cloche(etat, action) {
  const b = $('#btn-alerte');
  b.hidden = false;
  b.className = 'cloche' + (etat === 'active' ? ' active' : etat === 'attend' ? ' attend' : '');
  b.setAttribute('aria-label', etat === 'active' ? 'Alertes activées' : etat === 'bloquee' ? 'Alertes bloquées' : 'Activer les alertes');
  b.innerHTML = '';
  b.append(icone('cloche'));
  b.onclick = action;
}

function rendreAlerte() {
  const b = $('#btn-alerte');
  b.hidden = true; b.innerHTML = ''; b.onclick = null;
  const actif = () => toast(estDeputee() ? 'Alertes activées : tu es prévenue à chaque nouvelle demande.' : 'Alertes activées : tu es prévenu quand Sophia répond.');
  if (SOURCE.mode === 'exemples') {
    if (S.notifs) cloche('active', actif);
    else cloche('attend', () => { S.notifs = true; rendreAlerte(); toast('Alertes activées.'); });
    return;
  }
  if (surIphone() && horsEcranAccueil() && CFG.firebase) { cloche('attend', ouvrirAideIphone); return; }
  if (!alertesPossibles()) return;
  if (Notification.permission === 'denied') {
    cloche('bloquee', () => toast('Les alertes sont bloquées pour cette appli. Pour les rétablir, passe par les réglages du téléphone.'));
    return;
  }
  if (Notification.permission === 'granted' && lireLocal(CLE_ALERTES) === 'oui') { cloche('active', actif); return; }
  cloche('attend', activerAlertes);
}

function ouvrirAideIphone() {
  const f = $('#feuille');
  f.innerHTML = '';
  f.append(
    el('div', { class: 'poignee' }),
    el('h3', null, 'Sur iPhone, une étape avant les alertes'),
    el('ol', { class: 'etapes' }, [
      el('li', null, [el('b', null, 'Partager'), ' : touche le carré avec une flèche vers le haut, en bas de Safari.']),
      el('li', null, [el('b', null, "Sur l'écran d'accueil"), ' : fais défiler et touche cette ligne, puis « Ajouter ».']),
      el('li', null, ["Ouvre « Paraphe » depuis sa nouvelle icône et touche ", el('b', null, 'Activer'), '.']),
    ]),
    el('button', { class: 'envoyer', style: { background: 'var(--violet)' }, onclick: () => depiler() }, "J'ai compris"),
  );
  f.hidden = false; $('#voile').hidden = false;
  empiler(() => { f.hidden = true; $('#voile').hidden = true; });
}

async function jetonAlertes() {
  const reg = await navigator.serviceWorker.register('sw.js');
  await chargerScript('lib/firebase-app-compat.js');
  await chargerScript('lib/firebase-messaging-compat.js');
  const fb = window.firebase;
  if (!fb.apps.length) fb.initializeApp(CFG.firebase);
  const m = fb.messaging();
  if (!ALERTES_ECOUTE) {
    ALERTES_ECOUTE = true;
    // Appli ouverte : pas d'alerte système, un message dans l'appli et une remise à jour.
    m.onMessage(p => { const n = p.notification || {}; toast((n.title || 'Nouveau') + (n.body ? ' - ' + n.body : '')); SOURCE.recharger(); });
  }
  return m.getToken({ vapidKey: CFG.vapid, serviceWorkerRegistration: reg });
}
let ALERTES_ECOUTE = false;

async function activerAlertes() {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Alertes refusées. Tu pourras les activer plus tard.'); rendreAlerte(); return; }
    const jeton = await jetonAlertes();
    await SOURCE.abonner(jeton);
    ecrireLocal(CLE_ALERTES, 'oui');
    ecrireLocal(CLE_ALERTES + '.jeton', jeton);
    rendreAlerte();
    toast('Alertes activées sur ce téléphone.');
  } catch (e) {
    toast("Les alertes n'ont pas pu s'activer : " + (e.message === 'hors-ligne' ? 'pas de connexion.' : e.message));
  }
}

// À chaque ouverture : le service de fond garde l'appli lisible sans réseau, et le
// jeton d'alerte est renouvelé en silence s'il a changé.
async function preparerAlertes() {
  if (SOURCE.mode !== 'serveur' || !('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try { await navigator.serviceWorker.register('sw.js'); } catch (e) { return; }
  if (!alertesPossibles() || Notification.permission !== 'granted' || lireLocal(CLE_ALERTES) !== 'oui') return;
  try {
    const jeton = await jetonAlertes();
    if (jeton && jeton !== lireLocal(CLE_ALERTES + '.jeton')) { await SOURCE.abonner(jeton); ecrireLocal(CLE_ALERTES + '.jeton', jeton); }
  } catch (e) {}
}
