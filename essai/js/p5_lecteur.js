// p5_lecteur - les pièces jointes, ouvertes dans l'appli.
// v3 (24/11/2026, JL : « C'est des vrai fichier qui doivent etre dans les note de
// rdv ou a controle, ou des liens google »).
// v5 (24/11/2026, JL, en vocal : « la pièce jointe, elle est dans l'appli quand même,
// et donc tu peux faire le oui non directement ou [...] la correction directement
// avec la vue sur le document » ; « qu'on puisse se balader dessus, euh, zoomer ») :
// le script envoie le fichier (PDF, image ; documents Google et Word convertis en
// PDF), l'appli l'affiche elle-même (pdf.js pour les PDF), avec le zoom (deux doigts,
// double toucher, boutons) et, pour une demande, la barre de réponse en bas.
// Ce qui ne s'affiche pas (vidéo, fichier non partagé) s'ouvre dans Google.

function grandEcran() { return window.matchMedia && matchMedia('(min-width: 960px)').matches; }

function iconePiece(p) {
  const m = (p.mime || '') + ' ' + (p.nom || '') + ' ' + (p.ouvrir || '');
  if (/video|\.mp4|\.mov/i.test(m)) return 'video';
  return 'note';
}

// Carte d'une pièce dans une fiche (et dans l'agenda) : un toucher l'ouvre dans l'appli.
function cartePiece(p, ouvrir) {
  return el('button', { class: 'piece-ouvrir', onclick: ouvrir }, [icone(iconePiece(p)), el('span', null, p.nom || p.titre || 'Document'), el('b', null, 'Ouvrir')]);
}

// Lien ouvert par un vrai lien cliqué : plus sûr que window.open dans l'appli installée sur iPhone.
function ouvrirLien(url) {
  const a = el('a', { href: url, target: '_blank', rel: 'noopener' });
  document.body.appendChild(a); a.click(); a.remove();
}

// Pièce ouverte depuis l'agenda : la même visionneuse, sans barre de réponse.
function ouvrirPiece(p, toutes) { ouvrirLecteur({ pieces: toutes || [p], index: Math.max(0, (toutes || [p]).indexOf(p)) }); }

// ---------- pdf.js ----------
let PDFJS = null;
async function pdfjs() {
  if (PDFJS) return PDFJS;
  if (!window.pdfjsLib) await chargerScript('lib/pdf.min.js');
  const lib = window.pdfjsLib;
  const w = document.getElementById('pdf-travailleur');   // version d'essai : le travailleur est dans la page
  lib.GlobalWorkerOptions.workerSrc = w ? URL.createObjectURL(new Blob([w.textContent], { type: 'text/javascript' })) : 'lib/pdf.worker.min.js';
  PDFJS = lib;
  return lib;
}
function chargerScript(src) {
  return new Promise((ok, ko) => {
    if (document.querySelector('script[src="' + src + '"]')) return ok();
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => ko(new Error('chargement ' + src));
    document.head.appendChild(s);
  });
}

// ---------- La visionneuse ----------
// o = { pieces, index, demande } ; demande absente pour une pièce d'agenda.
let LECT = null;
function ouvrirLecteur(o) {
  const L = $('#lecteur');
  const deja = !L.hidden;
  if (o.demande) S.ouverte = o.demande;
  LECT = { pieces: o.pieces, index: o.index || 0, demande: o.demande || null, zoom: 1, doc: null, jeton: {} };
  rendreLecteur();
  L.hidden = false; $('#voile-ecran').hidden = false;
  if (!deja) empiler(() => {
    L.hidden = true; L.innerHTML = '';
    if (LECT && LECT.doc) try { LECT.doc.destroy(); } catch (e) {}
    LECT = null;
    if ($('#fiche').hidden) S.ouverte = null;
    $('#voile-ecran').hidden = $('#fiche').hidden && $('#histo').hidden && $('#deposer').hidden;
  });
}

function rendreLecteur() {
  const L = $('#lecteur'), o = LECT;
  const p = o.pieces[o.index];
  const d = o.demande;
  L.innerHTML = '';
  const titre = d ? d.titre : (p.titre || p.nom || 'Document');
  const sous = d ? [d.urgent ? 'Urgent' : '', POLES[poleDe(d)].lib, estInfo(d) ? 'Pour info' : echeanceTexte(d.echeance)].filter(Boolean).join(' · ') : (p.nom || '');
  const choixPiece = o.pieces.length > 1 ? el('div', { class: 'onglets-pieces' }, o.pieces.map((x, i) =>
    el('button', { 'aria-pressed': String(i === o.index), onclick: () => { if (i !== o.index) { o.index = i; o.zoom = 1; rendreLecteur(); } } }, x.nom || x.titre || ('Pièce ' + (i + 1))))) : null;
  const vue = el('div', { class: 'vue-doc', id: 'vue-doc' }, el('div', { class: 'pages', id: 'pages' }, el('p', { class: 'charge' }, 'Ouverture du document...')));
  L.append(...[
    el('div', { class: 'barre barre-lecteur' }, [
      el('button', { class: 'retour', onclick: () => depiler() }, [icone('retour'), 'Retour']),
      el('div', { class: 'titre-lecteur' }, [el('b', null, titre), el('small', null, sous)]),
      el('div', { class: 'zoom' }, [
        el('button', { 'aria-label': 'Réduire', onclick: () => zoomer(o.zoom / 1.25) }, icone('moins')),
        el('button', { 'aria-label': 'Agrandir', onclick: () => zoomer(o.zoom * 1.25) }, icone('plus')),
      ]),
    ]),
    choixPiece,
    d && d.mot ? el('p', { class: 'mot-lecteur' }, d.mot) : null,
    vue,
    d ? barreReponse(d) : null,
  ].filter(Boolean));
  gestesZoom(vue);
  afficherPiece(p);
}

async function afficherPiece(p) {
  const o = LECT, jeton = o.jeton = {};
  const zone = $('#pages');
  const repli = (texte) => {
    if (o.jeton !== jeton) return;
    zone.innerHTML = '';
    zone.append(el('div', { class: 'repli-doc' }, [el('p', null, texte),
      p.ouvrir && p.ouvrir !== '#' ? el('button', { class: 'bouton-lien', onclick: () => ouvrirLien(p.ouvrir) }, [icone('lien'), 'Ouvrir dans Google']) : null]));
  };
  let r;
  try { r = await SOURCE.lirePiece(p); }
  catch (e) { repli(e.message === 'hors-ligne' ? 'Pas de connexion : le document ne peut pas être chargé.' : e.message); return; }
  if (o.jeton !== jeton) return;
  if (!r || r.ouvrir) { repli((r && r.erreur) || 'Ce document s\'ouvre dans Google.'); return; }
  zone.innerHTML = '';
  if (/^image\//.test(r.mime)) {
    zone.append(el('img', { class: 'page', src: URL.createObjectURL(new Blob([r.octets], { type: r.mime })), alt: p.nom || 'Image' }));
    appliquerZoom();
    return;
  }
  if (/^audio\//.test(r.mime)) { zone.append(el('audio', { controls: true, src: URL.createObjectURL(new Blob([r.octets], { type: r.mime })) })); return; }
  try {
    const lib = await pdfjs();
    const doc = await lib.getDocument({ data: r.octets }).promise;
    if (o.jeton !== jeton) { doc.destroy(); return; }
    o.doc = doc;
    o.pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const c = el('canvas', { class: 'page', 'data-n': String(i) });
      zone.append(c);
      o.pages.push({ c, n: i, faite: 0 });
    }
    appliquerZoom();
    await dessinerPages();
  } catch (e) { repli("Le document n'a pas pu s'afficher."); }
}

// Chaque page est dessinée à la largeur affichée (zoom compris), nette sur l'écran du téléphone.
async function dessinerPages() {
  const o = LECT;
  if (!o || !o.doc) return;
  const jeton = o.jeton, larg = $('#vue-doc').clientWidth - 16;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  for (const pg of o.pages) {
    if (!LECT || LECT.jeton !== jeton) return;
    const cible = Math.round(larg * o.zoom * dpr);
    if (pg.faite === cible) continue;
    const page = await o.doc.getPage(pg.n);
    const v1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(cible / v1.width, 6) });
    const c = document.createElement('canvas');
    c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    if (!LECT || LECT.jeton !== jeton) return;
    pg.c.width = c.width; pg.c.height = c.height;
    pg.c.getContext('2d').drawImage(c, 0, 0);
    pg.c.style.aspectRatio = v1.width + ' / ' + v1.height;
    pg.faite = cible;
  }
}

function appliquerZoom() {
  const z = $('#pages');
  if (z && LECT) z.style.width = (LECT.zoom * 100) + '%';
}
let minuterieZoom = null;
function zoomer(z, cx, cy) {
  const o = LECT, vue = $('#vue-doc');
  if (!o || !vue) return;
  z = Math.max(1, Math.min(5, z));
  const ancien = o.zoom;
  if (z === ancien) return;
  // Garder sous le doigt (ou au centre) le même point du document.
  const r = vue.getBoundingClientRect();
  const px = (cx == null ? r.width / 2 : cx - r.left), py = (cy == null ? r.height / 2 : cy - r.top);
  const dx = (vue.scrollLeft + px) / ancien, dy = (vue.scrollTop + py) / ancien;
  o.zoom = z;
  appliquerZoom();
  vue.scrollLeft = dx * z - px; vue.scrollTop = dy * z - py;
  clearTimeout(minuterieZoom);
  minuterieZoom = setTimeout(dessinerPages, 200);
}

// Deux doigts pour zoomer, double toucher pour agrandir ou revenir.
function gestesZoom(vue) {
  let d0 = 0, z0 = 1, dernierToucher = 0;
  const ecart = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  vue.addEventListener('touchstart', e => {
    if (e.touches.length === 2) { d0 = ecart(e.touches); z0 = LECT.zoom; }
    else if (e.touches.length === 1) {
      const t = Date.now();
      if (t - dernierToucher < 300) { e.preventDefault(); zoomer(LECT.zoom > 1.05 ? 1 : 2.2, e.touches[0].clientX, e.touches[0].clientY); dernierToucher = 0; }
      else dernierToucher = t;
    }
  }, { passive: false });
  vue.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && d0) {
      e.preventDefault();
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2, cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomer(z0 * ecart(e.touches) / d0, cx, cy);
    }
  }, { passive: false });
  vue.addEventListener('touchend', e => { if (e.touches.length < 2) d0 = 0; });
  vue.addEventListener('dblclick', e => zoomer(LECT.zoom > 1.05 ? 1 : 2, e.clientX, e.clientY));
}
