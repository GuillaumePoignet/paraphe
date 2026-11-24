// p3_trancher - liste des demandes, fiche en grand, décision et commentaire.
// JL (23/11/2026) : « elle ouvre l'appli, et genre, assez simplement, elle a le
// document ou la demande écrite en gros, où elle peut dire oui, non, et mettre un
// commentaire. Et il faut que ce soit vraiment très très très simple aussi pour
// qu'elle puisse mettre le commentaire. »
//
// v5 (24/11/2026, JL, en vocal) :
// - « que les urgents [...] remontent » : une demande urgente passe en tête ;
// - « une couleur com, logistique, cabinet » puis « légistique » ; « une coche [...]
//   que de la com, que d'un truc, que de l'autre » : couleur et filtre par pôle ;
// - « Quand c'est un message sans pièce jointe [...] le oui non direct » : les
//   boutons sont sur la carte ; « dans le cas où il y a une pièce jointe, on appuie
//   ça, et ça ouvre directement la pièce jointe » : la pièce s'ouvre dans l'appli,
//   avec la barre de réponse (p5) ;
// - « juste elle écrit, elle a un espace pour écrire [...] le faire plutôt en vocal
//   [...] pas que ça écrive en sous-texte » : plus de réponses toutes faites, un
//   champ libre et un message vocal enregistré tel quel.

// v4 (24/11/2026, JL : « parfois ce sont juste des infos, et elle a rien a valider »).
function estInfo(d) { return d.type === 'info'; }
function poleDe(d) { return POLES[d.pole] ? d.pole : 'cabinet'; }
function filtree(d) { return !S.filtrePole || poleDe(d) === S.filtrePole; }
function trierDemandes() {
  // Infos à part ; arbitrages urgents d'abord, puis par échéance ; infos de la plus récente à la plus ancienne.
  S.demandes.sort((a, b) => (estInfo(a) - estInfo(b))
    || (estInfo(a) ? new Date(b.depose_le) - new Date(a.depose_le)
      : (!!b.urgent - !!a.urgent) || new Date(a.echeance) - new Date(b.echeance)));
}
function arbitrages() { return S.demandes.filter(d => !estInfo(d) && filtree(d)); }
function infos() { return S.demandes.filter(d => estInfo(d) && filtree(d)); }

// ---------- Filtre par pôle ----------
// Un toucher n'affiche que ce pôle ; un second toucher réaffiche tout.
function rendreFiltres() {
  const z = $('#filtres');
  z.innerHTML = '';
  const nb = k => S.demandes.filter(d => poleDe(d) === k).length;
  Object.keys(POLES).forEach(k => {
    const actif = S.filtrePole === k;
    z.appendChild(el('button', { class: 'filtre' + (actif ? ' actif' : ''), style: { '--c': POLES[k].c }, 'aria-pressed': String(actif), 'data-pole': k,
      onclick: () => { S.filtrePole = actif ? '' : k; rendreListe(); } },
      [el('i'), POLES[k].lib, el('span', { class: 'nb' }, String(nb(k)))]));
  });
}

// ---------- Cartes ----------
function etiquettes(d) {
  const t = TYPES[d.type] || TYPES.note;
  const p = POLES[poleDe(d)];
  return el('div', { class: 'ligne1' }, [
    el('span', { class: 'etiq' }, [
      d.urgent ? el('span', { class: 'urgent-tag' }, 'Urgent') : null,
      el('span', { class: 'pole', style: { '--c': p.c } }, p.lib),
      d.type === 'message' ? null : el('span', { class: 'type' }, [icone(estInfo(d) ? 'info' : d.type), t.lib]),
    ]),
    sansEcheance(d) ? el('span', { class: 'echeance' }, depuis(d.depose_le))
      : el('span', { class: 'echeance' + (estUrgent(d.echeance) ? ' urgent' : '') }, echeanceTexte(d.echeance)),
  ]);
}

function ligneCreneau(d) {
  if (!d.creneau) return null;
  const c = d.creneau, conflit = conflitAgenda(c.debut, c.fin);
  return el('p', { class: 'creneau' + (conflit ? ' conflit' : '') }, [icone('rdv'),
    el('span', null, majuscule(nomJour(c.debut)) + ', ' + heure(c.debut) + ' - ' + heure(c.fin) + (c.lieu ? ', ' + c.lieu : '')
      + (conflit ? ' - déjà pris' : ' - libre'))]);
}

function cartePieces(d) {
  const n = (d.pieces || []).length;
  if (!n) return null;
  return el('p', { class: 'pj-ligne' }, [icone(iconePiece(d.pieces[0])),
    el('span', null, n === 1 ? (d.pieces[0].nom || 'Document') : n + ' pièces jointes'), el('b', null, 'Ouvrir')]);
}

function carteDemande(d) {
  const p = POLES[poleDe(d)];
  if (estInfo(d)) {
    // v4 (JL : « pas besoin d'ouvrir l'info pour appuyer sur vu ») : « Vu » sur la carte.
    return el('div', { class: 'carte carte-info', style: { '--c': p.c }, 'data-id': d.id }, [
      el('button', { class: 'ouvrir-info', onclick: () => ouvrirArbitrage(d.id) }, [etiquettes(d), el('h3', null, d.titre),
        d.mot ? el('p', { class: 'bref' }, d.mot) : null, cartePieces(d), el('div', { class: 'pied' }, 'Déposé par ' + d.depose_par)]),
      estDeputee() ? el('button', { class: 'vu-rapide', 'aria-label': 'Marquer comme vu', onclick: () => vuDepuisListe(d) }, [icone('oui'), 'Vu']) : null,
    ]);
  }
  const avecPiece = (d.pieces || []).length > 0;
  return el('div', { class: 'carte' + (d.urgent ? ' est-urgent' : ''), style: { '--c': p.c }, 'data-id': d.id }, [
    el('button', { class: 'corps-carte', onclick: () => ouvrirArbitrage(d.id) }, [
      etiquettes(d),
      el('h3', null, d.titre),
      d.mot ? el('p', { class: 'bref' }, d.mot) : null,
      ligneCreneau(d),
      cartePieces(d),
      el('div', { class: 'pied' }, 'Déposé par ' + d.depose_par + ', ' + depuis(d.depose_le)),
    ]),
    // Sans pièce jointe : la réponse se donne sur la carte même.
    !avecPiece && estDeputee() ? el('div', { class: 'choix-carte' }, [
      el('button', { class: 'b-non', onclick: () => ouvrirFeuille('non', d) }, [icone('non'), 'Non']),
      el('button', { class: 'b-revoir', onclick: () => ouvrirFeuille('revoir', d) }, [icone('revoir'), 'À revoir']),
      el('button', { class: 'b-oui', onclick: () => ouvrirFeuille('oui', d) }, [icone('oui'), 'Oui']),
    ]) : null,
  ]);
}

// ---------- Côté équipe : les envois, avec la réponse de Sophia sur le message même ----------
// v6 (25/11/2026, JL : « où est-ce qu'on voit les retours de Sophia ? » ; arbitrage :
// « Sur le message même ») : chaque envoi porte « En attente » ou la réponse de Sophia,
// en couleur, avec son commentaire et son message vocal. Le plus récent en haut
// (réponse ou envoi).
function envois() {
  return S.demandes.filter(filtree).map(d => ({ d, rep: null, quand: d.depose_le }))
    .concat(S.tranchees.filter(x => filtree(x.demande)).map(x => ({ d: x.demande, rep: x, quand: x.le })))
    .sort((a, b) => new Date(b.quand) - new Date(a.quand));
}

function blocReponse(d, rep) {
  if (!rep) return el('div', { class: 'reponse attente-rep' }, estInfo(d) ? 'Pas encore vu par Sophia' : 'En attente de Sophia');
  const ch = CHOIX[rep.choix] || CHOIX.vu;
  const v = rep.vocal || d.vocal;
  const zoneVocal = el('div', { class: 'histo-vocal' });
  if (v) zoneVocal.append(el('button', { class: 'b-ecouter', onclick: () => ecouterVocal(v, zoneVocal) }, [icone('lecture'), 'Écouter' + (v.duree ? ' (' + duree(v.duree) + ')' : '')]));
  return el('div', { class: 'reponse', style: { '--r': ch.c } }, [
    el('div', { class: 'rep-tete' }, [el('b', null, ch.lib), ' · Sophia, ' + nomJour(rep.le) + ' à ' + heure(rep.le)]),
    rep.commentaire ? el('p', { class: 'rep-com' }, rep.commentaire) : null,
    v ? zoneVocal : null,
  ]);
}

function carteEnvoi(o) {
  const d = o.d, p = POLES[poleDe(d)], pieces = d.pieces || [];
  return el('div', { class: 'carte carte-envoi' + (o.rep ? ' repondu' : ''), style: { '--c': p.c }, 'data-id': d.id }, [
    el('div', { class: 'ligne1' }, [
      el('span', { class: 'etiq' }, [
        d.urgent ? el('span', { class: 'urgent-tag' }, 'Urgent') : null,
        el('span', { class: 'pole', style: { '--c': p.c } }, p.lib),
        estInfo(d) ? el('span', { class: 'type' }, [icone('info'), 'Info']) : null,
      ]),
      el('span', { class: 'echeance' }, d.depose_par + ', ' + depuis(d.depose_le)),
    ]),
    el('h3', null, d.titre),
    d.mot ? el('p', { class: 'bref' }, d.mot) : null,
    pieces.length ? el('div', { class: 'docs' }, pieces.map(x =>
      el('button', { onclick: () => ouvrirPiece(x, pieces) }, [icone(iconePiece(x)), el('span', null, x.nom || x.titre || 'Document')]))) : null,
    blocReponse(d, o.rep),
  ]);
}

function rendreEnvois() {
  rendreFiltres();
  const n = S.demandes.length;
  $('#compte').textContent = n ? String(n) : '';
  $('#compte').hidden = !n;
  rendreOnglets();
  const zone = $('#liste');
  zone.innerHTML = '';
  const L = envois();
  if (!L.length) zone.appendChild(el('div', { class: 'vide' }, S.filtrePole
    ? [el('strong', null, 'Rien pour « ' + POLES[S.filtrePole].lib + ' »'), 'Touche le filtre à nouveau pour tout revoir.']
    : [el('strong', null, 'Aucun envoi pour l\'instant'), 'Écris ton message à Sophia ci-dessus.']));
  L.forEach(o => zone.appendChild(carteEnvoi(o)));
  if (SOURCE.mode === 'serveur') zone.appendChild(el('button', { class: 'deconnexion', onclick: () => SOURCE.deconnexion() }, 'Se déconnecter de ce téléphone'));
}

// « Vu » touché depuis la liste : rien ne s'ouvre, l'info disparaît, Annuler possible.
function vuDepuisListe(d) {
  if (!estDeputee()) return;
  enregistrer(d, 'vu', '', null, true);
  rendreListe();
  toast('Marqué comme vu.', annulerDerniere);
}

function rendreListe() {
  trierDemandes();
  if (!estDeputee()) return rendreEnvois();
  rendreFiltres();
  const A = arbitrages(), I = infos();
  const total = S.demandes.filter(d => !estInfo(d)).length;
  $('#compte').textContent = total ? String(total) : '';
  $('#compte').hidden = !total;
  rendreOnglets();
  const zone = $('#liste');
  zone.innerHTML = '';
  if (!A.length) zone.appendChild(el('div', { class: 'vide' }, S.filtrePole
    ? [el('strong', null, 'Rien pour « ' + POLES[S.filtrePole].lib + ' »'), 'Touche le filtre à nouveau pour tout revoir.']
    : [el('strong', null, 'Aucun arbitrage en attente'), 'Tout est à jour. Tu seras prévenue à la prochaine demande.']));
  A.forEach(d => zone.appendChild(carteDemande(d)));
  if (I.length) {
    zone.appendChild(el('h2', { class: 'titre-info' }, ['Pour info ', el('span', { class: 'compte-info' }, String(I.length))]));
    I.forEach(d => zone.appendChild(carteDemande(d)));
  }
}

// ---------- Ouvrir une demande ----------
// Avec pièce jointe : la pièce s'ouvre dans l'appli, la barre de réponse en bas.
// Sans pièce : la fiche.
function ouvrirArbitrage(id) {
  const d = S.demandes.find(x => x.id === id);
  if (!d) return;
  if ((d.pieces || []).length) ouvrirLecteur({ pieces: d.pieces, demande: d });
  else ouvrirFiche(id);
}

function ouvrirFiche(id) {
  const d = S.demandes.find(x => x.id === id);
  if (!d) return;
  const deja = !$('#fiche').hidden;
  S.ouverte = d;
  rendreFiche(d);
  $('#fiche').hidden = false;
  $('#voile-ecran').hidden = false;
  $('.defile', $('#fiche')).scrollTop = 0;
  if (!deja) empiler(fermerFiche);
}
function fermerFiche() { $('#fiche').hidden = true; $('#voile-ecran').hidden = $('#lecteur').hidden; if ($('#lecteur').hidden) S.ouverte = null; }

function encadre(titre, contenu, cls) {
  return el('div', { class: 'encadre' + (cls ? ' ' + cls : '') }, [titre ? el('h4', null, titre) : null].concat(contenu));
}

// La barre du bas : réponse (députée), « Vu » (info), ou attente (équipe).
function barreReponse(d) {
  if (!estDeputee()) return el('div', { class: 'attente' }, estInfo(d) ? 'Pas encore vu par Sophia' : 'En attente de la réponse de Sophia');
  if (estInfo(d)) return el('div', { class: 'decision vu' }, [el('button', { class: 'b-vu', onclick: () => decider('vu', '') }, [icone('oui'), 'Vu'])]);
  return el('div', { class: 'decision' }, [
    el('button', { class: 'b-non', onclick: () => ouvrirFeuille('non') }, [icone('non'), 'Non']),
    el('button', { class: 'b-revoir', onclick: () => ouvrirFeuille('revoir') }, [icone('revoir'), 'À revoir']),
    el('button', { class: 'b-oui', onclick: () => ouvrirFeuille('oui') }, [icone('oui'), 'Oui']),
  ]);
}

function rangDans(d) {
  const groupe = estInfo(d) ? infos() : arbitrages();
  return { rang: groupe.indexOf(d) + 1, total: groupe.length };
}

function rendreFiche(d) {
  const f = $('#fiche');
  f.innerHTML = '';
  const { rang, total } = rangDans(d);
  const barre = el('div', { class: 'barre' }, [
    el('button', { class: 'retour', onclick: () => depiler() }, [icone('retour'), 'Retour']),
    el('span', { class: 'position' }, rang ? rang + ' sur ' + total : ''),
  ]);
  const corps = el('div', { class: 'corps' });
  corps.appendChild(etiquettes(d));
  corps.appendChild(el('h1', null, d.titre));
  const pieces = d.pieces || [];
  if (pieces.length) corps.appendChild(el('div', { class: 'pieces' }, pieces.map((p, i) => cartePiece(p, () => ouvrirLecteur({ pieces, index: i, demande: d })))));
  if (d.mot) corps.appendChild(el('p', { class: 'mot' }, d.mot));
  if (d.creneau) {
    const c = d.creneau;
    const conflit = conflitAgenda(c.debut, c.fin);
    corps.appendChild(encadre('Quand et où', [
      el('p', { class: 'quand' }, majuscule(nomJour(c.debut)) + ', ' + heure(c.debut) + ' - ' + heure(c.fin)),
      c.lieu ? el('p', { class: 'meta' }, c.lieu) : null,
      conflit
        ? el('div', { class: 'etat conflit' }, [icone('alerte'), el('span', null, conflit.journee
            ? 'Ce jour-là, tu as « ' + conflit.titre + ' » toute la journée.'
            : 'Tu as déjà « ' + conflit.titre + ' » à cette heure (' + heure(conflit.debut) + ' - ' + heure(conflit.fin) + ').')])
        : el('div', { class: 'etat libre' }, [icone('ok'), el('span', null, 'Ce créneau est libre dans ton agenda.')]),
    ]));
  }
  corps.appendChild(el('p', { class: 'meta' }, 'Déposé par ' + d.depose_par + ', ' + depuis(d.depose_le) + (pieces.length ? '' : '. Aucune pièce jointe.')));
  f.append(barre, el('div', { class: 'defile' }, corps), barreReponse(d));
}

// ---------- Feuille de réponse : texte libre et message vocal ----------
const CHOIX = {
  oui: { titre: 'Oui', bouton: 'Envoyer mon oui', c: 'var(--oui)', lib: 'Oui' },
  revoir: { titre: 'À revoir', bouton: "Renvoyer à l'équipe", c: 'var(--revoir)', lib: 'À revoir' },
  non: { titre: 'Non', bouton: 'Envoyer mon non', c: 'var(--non)', lib: 'Non' },
  vu: { lib: 'Vu', c: 'var(--accent)' },
};
let enreg = null;   // enregistrement en cours : { rec, morceaux, debut, minuterie }

function ouvrirFeuille(choix, demande) {
  if (demande) S.ouverte = demande;
  const d = S.ouverte;
  if (!d) return;
  const ch = CHOIX[choix];
  const f = $('#feuille');
  f.innerHTML = '';
  let vocal = null;    // { blob, mime, duree, url }
  const zone = el('textarea', { id: 'commentaire', rows: '3', placeholder: choix === 'oui' ? 'Un mot pour l\'équipe (facultatif)' : 'Ton commentaire (facultatif)', 'aria-label': 'Commentaire' });
  const blocVocal = el('div', { class: 'vocal' });
  function rendreVocal(etat) {
    blocVocal.innerHTML = '';
    if (etat === 'enreg') {
      const t = el('span', { class: 'chrono' }, '0:00');
      blocVocal.append(el('span', { class: 'rec-point' }), t,
        el('button', { class: 'b-arret', onclick: () => arreterEnregistrement() }, [icone('arret'), 'Arrêter']));
      enreg.minuterie = setInterval(() => { t.textContent = duree((Date.now() - enreg.debut) / 1000); }, 250);
      return;
    }
    if (vocal) {
      blocVocal.append(el('audio', { controls: true, src: vocal.url, preload: 'metadata' }),
        el('button', { class: 'b-lien', onclick: () => { URL.revokeObjectURL(vocal.url); vocal = null; rendreVocal(); } }, 'Supprimer'));
      return;
    }
    if (!vocalPossible()) return;
    blocVocal.append(el('button', { class: 'b-vocal', onclick: demarrer }, [icone('micro'), 'Enregistrer un message vocal']));
  }
  async function demarrer() {
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
      const rec = mime ? new MediaRecorder(flux, { mimeType: mime }) : new MediaRecorder(flux);
      enreg = { rec, morceaux: [], debut: Date.now(), flux };
      rec.ondataavailable = e => { if (e.data && e.data.size) enreg.morceaux.push(e.data); };
      rec.onstop = () => {
        clearInterval(enreg.minuterie);
        flux.getTracks().forEach(t => t.stop());
        const type = (rec.mimeType || mime || 'audio/webm').split(';')[0];
        const blob = new Blob(enreg.morceaux, { type });
        vocal = { blob, mime: type, duree: Math.round((Date.now() - enreg.debut) / 1000), url: URL.createObjectURL(blob) };
        enreg = null;
        rendreVocal();
      };
      rec.start(250);
      rendreVocal('enreg');
    } catch (e) {
      enreg = null;
      toast("Le micro n'est pas accessible. Autorise-le dans les réglages, ou écris ton commentaire.");
      rendreVocal();
    }
  }
  rendreVocal();
  f.append(
    el('div', { class: 'poignee' }),
    el('h3', { style: { color: ch.c } }, ch.titre),
    el('p', { class: 'sous-titre' }, d.titre),
    el('div', { class: 'saisie' }, [zone]),
    blocVocal,
    el('button', { class: 'envoyer', style: { background: ch.c }, onclick: () => {
      if (enreg) { toast("Arrête d'abord l'enregistrement."); return; }
      decider(choix, zone.value.trim(), vocal);
    } }, ch.bouton),
  );
  f.hidden = false;
  $('#voile').hidden = false;
  empiler(fermerFeuille);
}
function vocalPossible() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) && !ENCADRE; }
function arreterEnregistrement() { if (enreg && enreg.rec.state !== 'inactive') enreg.rec.stop(); }
function fermerFeuille() {
  if (enreg) { try { enreg.rec.onstop = null; enreg.rec.stop(); enreg.flux.getTracks().forEach(t => t.stop()); clearInterval(enreg.minuterie); } catch (e) {} enreg = null; }
  $('#feuille').hidden = true; $('#voile').hidden = true;
}
function duree(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

// ---------- Décision ----------
let derniere = null;
// Enregistre la réponse (optimiste) ; la remet dans la liste si l'envoi échoue.
function enregistrer(d, choix, commentaire, vocal, depuisListe) {
  const idx = S.demandes.indexOf(d);
  const trace = { demande: d, choix, commentaire, vocal: vocal || null, le: maintenant().toISOString() };
  S.demandes.splice(idx, 1);
  S.tranchees.unshift(trace);
  // Un rendez-vous accepté va directement dans l'agenda (version d'essai ; au serveur, l'équipe l'inscrit).
  let ajout = null;
  if (choix === 'oui' && d.creneau && SOURCE.mode === 'exemples') {
    ajout = { id: 'a' + d.id, titre: d.titre.replace(/^Rendez-vous avec /, 'RDV ').replace(/^Invitation dans /, ''), lieu: d.creneau.lieu, debut: d.creneau.debut, fin: d.creneau.fin, docs: [] };
    S.agenda.push(ajout);
  }
  derniere = { trace, idx, ajout, depuisListe };
  SOURCE.decider(trace).catch(err => {
    if (derniere && derniere.trace === trace) derniere = null;
    const i = S.tranchees.indexOf(trace); if (i >= 0) S.tranchees.splice(i, 1);
    if (!S.demandes.includes(d)) S.demandes.splice(Math.min(idx, S.demandes.length), 0, d);
    rendreListe();
    toast(err.message === 'hors-ligne' ? "Pas de connexion. Ta réponse n'est pas partie, réessaie." : 'Pas envoyé : ' + err.message);
  });
  return ajout;
}

function decider(choix, commentaire, vocal) {
  const d = S.ouverte;
  if (!d) return;
  const avant = estInfo(d) ? infos() : arbitrages();
  const rang = avant.indexOf(d);
  const ecranOuvert = !$('#fiche').hidden || !$('#lecteur').hidden;
  const ajout = enregistrer(d, choix, commentaire, vocal, !ecranOuvert);
  const groupe = avant.filter(x => x !== d);
  const suivante = ecranOuvert ? (groupe[rang] || groupe[0]) : null;
  rendreListe(); rendreAgenda();
  // Tout refermer (feuille, fiche, pièce), puis ouvrir la suivante s'il y en a une.
  S.ouverte = null;
  depiler(PILE.length, () => { if (suivante) ouvrirArbitrage(suivante.id); });
  const qui = d.depose_par === 'Claude' || !d.depose_par ? "l'équipe" : d.depose_par;
  toast(choix === 'vu' ? 'Marqué comme vu.' : CHOIX[choix].lib + ' envoyé à ' + qui + (ajout ? '. Mis à ton agenda.' : '.'), annulerDerniere);
}

function annulerDerniere() {
  if (!derniere) return;
  const { trace, idx, ajout, depuisListe } = derniere;
  SOURCE.annuler(trace).catch(err => toast("L'annulation n'est pas passée : " + (err.message === 'hors-ligne' ? 'pas de connexion.' : err.message)));
  S.tranchees.splice(S.tranchees.indexOf(trace), 1);
  S.demandes.splice(Math.min(idx, S.demandes.length), 0, trace.demande);
  if (ajout) S.agenda.splice(S.agenda.indexOf(ajout), 1);
  derniere = null;
  rendreListe(); rendreAgenda();
  depiler(PILE.length, () => { if (!depuisListe) ouvrirArbitrage(trace.demande.id); });
}

// ---------- Message bref ----------
let minuterie = null;
function toast(texte, annuler) {
  const t = $('#toast');
  t.innerHTML = '';
  t.append(el('p', null, texte));
  if (annuler) t.append(el('button', { onclick: () => { t.hidden = true; annuler(); } }, 'Annuler'));
  t.hidden = false;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { t.hidden = true; }, annuler ? 8000 : 3000);
}

// ---------- Déjà arbitré / Réponses ----------
function ouvrirHisto() {
  const h = $('#histo');
  h.innerHTML = '';
  const corps = el('div', { class: 'corps' }, [el('h1', null, estDeputee() ? 'Déjà arbitré' : 'Réponses de Sophia')]);
  if (!S.tranchees.length) corps.appendChild(el('div', { class: 'vide', style: { marginTop: '14px' } }, 'Aucune décision pour l\'instant.'));
  S.tranchees.forEach(x => {
    const ch = CHOIX[x.choix] || CHOIX.vu;
    const v = x.vocal || x.demande.vocal;
    const zoneVocal = el('div', { class: 'histo-vocal' });
    if (v) zoneVocal.append(el('button', { class: 'b-ecouter', onclick: () => ecouterVocal(v, zoneVocal) }, [icone('lecture'), 'Écouter le message vocal' + (v.duree ? ' (' + duree(v.duree) + ')' : '')]));
    corps.appendChild(el('div', { class: 'histo', style: { '--c': POLES[poleDe(x.demande)].c } }, [
      el('div', { class: 'choix', style: { color: ch.c } }, ch.lib + ' - ' + nomJour(x.le) + ' à ' + heure(x.le)),
      el('div', { class: 'histo-titre' }, x.demande.titre),
      x.commentaire ? el('div', { class: 'com' }, '« ' + x.commentaire + ' »') : null,
      v ? zoneVocal : null,
    ]));
  });
  if (SOURCE.mode === 'serveur') corps.appendChild(el('button', { class: 'deconnexion', onclick: () => SOURCE.deconnexion() }, 'Se déconnecter de ce téléphone'));
  h.append(el('div', { class: 'barre' }, [el('button', { class: 'retour', onclick: () => depiler() }, [icone('retour'), 'Retour'])]), el('div', { class: 'defile' }, corps));
  h.hidden = false; $('#voile-ecran').hidden = false;
  empiler(() => { h.hidden = true; $('#voile-ecran').hidden = $('#fiche').hidden && $('#lecteur').hidden; });
}

// Le message vocal : relu depuis le Drive par le script (ou gardé sur place juste après l'enregistrement).
async function ecouterVocal(v, zone) {
  zone.innerHTML = '';
  zone.append(el('span', { class: 'meta' }, 'Chargement...'));
  try {
    let url = v.url;
    if (!url && v.blob) url = v.url = URL.createObjectURL(v.blob);
    if (!url) { const r = await SOURCE.lirePiece({ gid: v.gid }); url = v.url = URL.createObjectURL(new Blob([r.octets], { type: r.mime })); }
    zone.innerHTML = '';
    const a = el('audio', { controls: true, src: url });
    zone.append(a);
    a.play().catch(() => {});
  } catch (e) {
    zone.innerHTML = '';
    zone.append(el('span', { class: 'meta' }, "Le message vocal n'a pas pu être lu : " + (e.message === 'hors-ligne' ? 'pas de connexion.' : e.message)));
  }
}
