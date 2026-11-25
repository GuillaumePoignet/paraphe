// p1_base - outils communs, état, dates en français, icônes.
// v1 (23/11/2026, JL : « un truc vraiment très, très, très, très simple à utiliser »).

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

// Fabrique d'élément : el('div', {class:'x', onclick:f}, [enfants ou texte])
function el(tag, attrs, enfants) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') { for (const p in v) { if (p.startsWith('--')) n.style.setProperty(p, v[p]); else n.style[p] = v[p]; } }
    else n.setAttribute(k, v === true ? '' : v);
  }
  (Array.isArray(enfants) ? enfants : enfants === undefined ? [] : [enfants]).forEach(e => {
    if (e === null || e === undefined || e === false) return;
    n.appendChild(typeof e === 'string' || typeof e === 'number' ? document.createTextNode(String(e)) : e);
  });
  return n;
}

// État de l'appli. Les données viennent de p2 (exemples) en attendant le serveur.
const S = {
  demandes: [],     // en attente de décision, triées par échéance
  tranchees: [],    // décisions prises (historique)
  agenda: [],       // événements {id, titre, lieu, debut, fin, journee, docs:[]}
  onglet: 'trancher',
  jourSel: 0,       // jour affiché à gauche de l'agenda, en décalage depuis aujourd'hui
  ouverte: null,    // demande affichée dans la fiche
  notifs: false,
  // v5 : filtre par pôle (vide = tout) ; agenda : jours dessinés, jours chargés (décalages depuis aujourd'hui).
  filtrePole: '',
  agPlage: { de: -7, a: 20 },
  agCouvert: { de: -7, a: 20 },
}; 

// Dates et heures, à la française
const JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function maintenant() { return new Date(); }
function debutJour(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function ajouterJours(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ecartJours(a, b) { return Math.round((debutJour(a) - debutJour(b)) / 86400000); }
function heure(d) { d = new Date(d); const m = d.getMinutes(); return d.getHours() + 'h' + (m ? String(m).padStart(2,'0') : ''); }
function dateLongue(d) { d = new Date(d); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; }
function nomJour(d) {
  const e = ecartJours(d, maintenant());
  if (e === 0) return "aujourd'hui";
  if (e === 1) return 'demain';
  if (e === -1) return 'hier';
  return dateLongue(d);
}
function echeanceTexte(d) {
  const e = ecartJours(d, maintenant());
  const h = heure(d);
  if (e < 0) return 'En retard';
  if (e === 0) return (new Date(d).getHours() >= 18 ? 'Ce soir' : "Aujourd'hui") + ' avant ' + h;
  if (e === 1) return 'Demain avant ' + h;
  const x = new Date(d);
  return JOURS[x.getDay()].replace(/^./, c => c.toUpperCase()) + ' ' + x.getDate() + ' avant ' + h;
}
function estUrgent(d) { return (new Date(d) - maintenant()) < 6 * 3600000; }
function depuis(d) {
  const min = Math.round((maintenant() - new Date(d)) / 60000);
  if (min < 2) return "à l'instant";
  if (min < 60) return 'il y a ' + min + ' min';
  const h = Math.round(min / 60);
  if (h < 24 && ecartJours(d, maintenant()) === 0) return 'il y a ' + h + ' h';
  return nomJour(d);
}
function majuscule(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Icônes (tracés simples, pas d'emoji)
const ICONES = {
  courrier: '<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',
  rdv: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  tweet: '<path d="M5 5h14v10H9l-4 4z"/>',
  media: '<circle cx="12" cy="9" r="3.5"/><path d="M12 13v5M8 21h8M6 9a6 6 0 0 0 12 0"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  questions: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/>',
  retour: '<path d="m15 5-7 7 7 7"/>',
  oui: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  non: '<path d="M6 6l12 12M18 6 6 18"/>',
  revoir: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  micro: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  alerte: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  lecture: '<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>',
  lien: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  liste: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  agenda: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  arret: '<rect x="7" y="7" width="10" height="10" rx="1"/>',
  moins: '<path d="M5 12h14"/>',
  gauche: '<path d="m15 5-7 7 7 7"/>',
  droite: '<path d="m9 5 7 7-7 7"/>',
  envoyer: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>',
  trombone: '<path d="M20 11.5 12.4 19a5 5 0 0 1-7.1-7.1l8-8a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4"/>',
  paraphe: '<path d="M3.8 15c2.2-5.2 4.5-8.3 6-8.3 1.9 0-1.1 8.3 1.1 8.3 1.9 0 2.6-4.5 4.1-4.5 1.1 0 .4 3.4 1.9 3.4 1.1 0 1.9-1.5 3.4-2.3"/><path d="M4.5 18.8h15"/>',
  cloche: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
};
function icone(nom) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONES[nom] || '';
  return s;
}

// Types de demande : libellé et couleur
const TYPES = {
  courrier: { lib: 'Courrier', c: 'var(--courrier)' },
  rdv: { lib: 'Rendez-vous', c: 'var(--rdv)' },
  video: { lib: 'Vidéo', c: 'var(--video)' },
  tweet: { lib: 'Message réseaux', c: 'var(--tweet)' },
  media: { lib: 'Invitation média', c: 'var(--media)' },
  note: { lib: 'Note', c: 'var(--doux)' },
  // v4 (24/11/2026, JL : « parfois ce sont juste des infos, et elle a rien a valider »)
  info: { lib: 'Pour info', c: '#6B6580' },
  // v6 (25/11/2026, JL : « Il faut que ce soit super simple [...] comme envoyer un message
  // Telegram ») : un dépôt n'a plus de type ni d'échéance ; c'est un message.
  message: { lib: 'Message', c: 'var(--doux)' },
};
// Sans échéance : l'heure du dépôt tient lieu de repère.
function sansEcheance(d) { return d.type === 'info' || d.type === 'message'; }

// v5 (24/11/2026, JL : « une couleur com, logistique, cabinet », puis « légistique » ;
// « tu mets pas nos noms ») : un pôle par compte de l'équipe, une couleur sobre par pôle.
const POLES = {
  cabinet: { lib: 'Cabinet', c: '#1F3A68' },
  com: { lib: 'Com', c: '#A1561B' },
  legistique: { lib: 'Légistique', c: '#2C6B52' },
};

// Retour arrière du téléphone : chaque écran ouvert pousse une étape d'historique,
// le bouton retour du téléphone le referme au lieu de quitter l'appli.
// Dans une page encadrée (aperçu partagé), on n'utilise pas l'historique du navigateur.
const ENCADRE = (() => { try { return window.top !== window; } catch (e) { return true; } })();
const PILE = [];
function empiler(fermer) { PILE.push(fermer); if (!ENCADRE) try { history.pushState({ n: PILE.length }, ''); } catch (e) {} }
// « ensuite » (v5) : appelé une fois les écrans refermés (le retour du navigateur est différé).
let ENSUITE = null;
function depiler(k, ensuite) {
  k = Math.min(k || 1, PILE.length);
  if (!k) { if (ensuite) ensuite(); return; }
  if (ENCADRE) { while (k--) PILE.pop()(); if (ensuite) ensuite(); return; }
  ENSUITE = ensuite || null;
  try { history.go(-k); } catch (e) { while (k--) PILE.pop()(); const f = ENSUITE; ENSUITE = null; if (f) f(); }
}
window.addEventListener('popstate', (e) => {
  const n = (e.state && e.state.n) || 0;
  while (PILE.length > n) PILE.pop()();
  const f = ENSUITE; ENSUITE = null;
  if (f) f();
});
