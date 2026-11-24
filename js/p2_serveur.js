// p2_serveur - lecture et écriture par le script Google (v2, 24/11/2026).
// JL (23/11/2026) : « Google mais quel lien par rapport aux notif ? », puis
// « Oui, je te prépare le plan » : tableau + script Google, alertes par Firebase.
// Le réglage (adresse du script, Firebase) vient de config.js, chargé avant la page.
// v3 (24/11/2026) : envoi des fichiers joints (televerser) ; plus de lecture de texte.

const CFG = (typeof self !== 'undefined' && self.CONFIG_A_DECIDER) || {};
const CLE_JETON = 'adecider.jeton', CLE_ETAT = 'adecider.etat';
function lireLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function ecrireLocal(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

async function appel(action, donnees) {
  const corps = Object.assign({ action, jeton: lireLocal(CLE_JETON) }, donnees || {});
  let r;
  try { r = await fetch(CFG.script, { method: 'POST', body: JSON.stringify(corps), redirect: 'follow' }); }
  catch (e) { throw new Error('hors-ligne'); }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('hors-ligne'); }
  if (!j.ok && j.code === 'session') { ecrireLocal(CLE_JETON, null); ecrireLocal(CLE_ETAT, null); afficherConnexion(); throw new Error('session'); }
  if (!j.ok) throw new Error(j.erreur || 'Erreur');
  return j;
}

const PIECES_LUES = {};
function octetsBase64(b64) { const s = atob(b64), o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }
function base64De(blob) {
  return new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => ko(new Error('Lecture du message vocal impossible')); r.readAsDataURL(blob); });
}

function appliquerEtat(j) {
  S.moi = j.moi;
  S.demandes = j.demandes || [];
  S.tranchees = (j.tranchees || []).map(d => ({ demande: d, choix: d.choix, commentaire: d.commentaire, le: d.tranche_le }));
  // L'état porte l'agenda de J-7 à J+20 ; les jours chargés en plus (défilement) sont gardés.
  const debut = ajouterJours(debutJour(maintenant()), -7);
  if (!S.agenda.length) S.agenda = j.agenda || [];
  else fusionnerAgenda(j.agenda || [], debut, ajouterJours(debut, 28));
}

const SOURCE = {
  mode: 'serveur',
  async demarrer() {
    if (!lireLocal(CLE_JETON)) { afficherConnexion(); return false; }
    const cache = lireLocal(CLE_ETAT);
    if (cache) { try { appliquerEtat(JSON.parse(cache)); toutRendre(); } catch (e) {} }
    return this.recharger();
  },
  async recharger() {
    try {
      const j = await appel('etat');
      appliquerEtat(j);
      ecrireLocal(CLE_ETAT, JSON.stringify(j));
      S.horsLigne = false;
    } catch (e) {
      if (e.message === 'session') return false;
      S.horsLigne = true;
    }
    toutRendre();
    return true;
  },
  async connexion(nom, code) {
    const j = await appel('connexion', { nom, code });
    ecrireLocal(CLE_JETON, j.jeton);
    return j;
  },
  deconnexion() { ecrireLocal(CLE_JETON, null); ecrireLocal(CLE_ETAT, null); location.hash = ''; location.reload(); },
  // v5 : le message vocal part avec la réponse ; le script le range dans le Drive.
  async decider(t) {
    const d = { id: t.demande.id, choix: t.choix, commentaire: t.commentaire };
    if (t.vocal && t.vocal.blob) d.vocal = { mime: t.vocal.mime, duree: t.vocal.duree, contenu: await base64De(t.vocal.blob) };
    await appel('decider', d);
  },
  async annuler(t) { await appel('annuler', { id: t.demande.id }); },
  async deposer(q) { return appel('deposer', { demande: q }); },
  async deposerDoc(o) { return appel('deposerDoc', o); },
  async televerser(nom, mime, contenu) { return appel('televerser', { nom, mime, contenu }); },
  async abonner(jetonFcm) { return appel('abonner', { jeton_fcm: jetonFcm }); },
  // v5 : le contenu d'une pièce, servi par le script (gardé en mémoire le temps de la visite).
  async lirePiece(p) {
    if (!p.gid) return { ouvrir: true, erreur: 'Ce lien s\'ouvre dans le navigateur.' };
    if (PIECES_LUES[p.gid]) return PIECES_LUES[p.gid];
    let j;
    try { j = await appel('piece', { gid: p.gid }); }
    catch (e) { if (e.message === 'hors-ligne' || e.message === 'session') throw e; return { ouvrir: true, erreur: e.message }; }
    const r = { mime: j.mime, octets: octetsBase64(j.contenu) };
    PIECES_LUES[p.gid] = r;
    return r;
  },
  // v5 : une plage de l'agenda, pour le défilement sans fin.
  async chargerAgenda(debut, jours) {
    const j = await appel('agenda', { debut: new Date(debut).toISOString(), jours });
    fusionnerAgenda(j.agenda || [], debut, ajouterJours(debut, jours));
  },
};
