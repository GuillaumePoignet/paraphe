// p7_deposer - l'équipe écrit à Sophia.
// v2 (24/11/2026) : l'équipe dépose ici ; Claude dépose par le même serveur.
// v3 (24/11/2026) : on joint la pièce (fichier ou lien Google) au lieu de recopier.
//
// v6 (25/11/2026, JL : « pour déposer c'est trop compliqué, il faut cliquer sur trop de
// choses différentes [...] Il faut simplifier vraiment le truc » ; « C'est pas nécessaire
// de connaître les timings [...] au pire, on fait un titre » ; « Pour joindre le fichier,
// il faut qu'on puisse aussi faire un drag and drop » ; « Le seul qu'on peut mettre, c'est
// [...] si c'est une info, on peut juste cocher » ; « comme envoyer un message Telegram » ;
// arbitrage : garder Urgent et Info) : une zone de message en haut des envois, un
// trombone, deux cases, Envoyer. Plus de type, plus d'échéance, plus de créneau.
// La première ligne du message fait le titre, la suite le détail. Un lien collé dans le
// message devient une pièce jointe. On peut glisser un fichier n'importe où dans la
// fenêtre, ou le coller. Pour joindre une note à un rendez-vous : bouton « Joindre » sur
// le rendez-vous, dans l'agenda (p4).

const TAILLE_MAX = 30 * 1024 * 1024;
const RE_LIEN = /https?:\/\/[^\s<>"]+/g;

function lireBase64(fichier) {
  return new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] || '');
    r.onerror = () => ko(new Error('Lecture du fichier impossible'));
    r.readAsDataURL(fichier);
  });
}
function taille(o) { return o > 1048576 ? (o / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(o / 1024)) + ' Ko'; }

// Les fichiers partent un par un dans le Drive ; on renvoie les pièces prêtes.
async function televerserTout(pieces, etape) {
  const prets = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.url) { prets.push({ url: p.url }); continue; }
    if (etape) etape(i + 1, pieces.length);
    const r = await SOURCE.televerser(p.fichier.name, p.fichier.type, await lireBase64(p.fichier));
    prets.push(r.piece);
  }
  return prets;
}

// Découpe le message : liens → pièces ; première ligne → titre ; le reste → détail.
function decouperMessage(texte, pieces) {
  const liens = texte.match(RE_LIEN) || [];
  const propre = texte.replace(RE_LIEN, ' ').split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim());
  while (propre.length && !propre[0]) propre.shift();
  let titre = propre.shift() || '';
  const mot = propre.join('\n').trim();
  if (!titre) {
    const f = pieces.find(p => p.fichier);
    titre = f ? f.fichier.name.replace(/\.[^.]+$/, '') : liens.length ? 'Lien partagé' : '';
  }
  return { titre: titre.slice(0, 300), mot, liens };
}

const COMPO = { pieces: [] };   // pièces en attente d'envoi : { fichier } ou { url }

function rendreComposeur() {
  let z = $('#composeur');
  if (estDeputee()) { if (z) z.remove(); return; }
  if (z) return;
  const zone = el('textarea', { id: 'm-texte', rows: '1', placeholder: 'Message pour Sophia', 'aria-label': 'Message pour Sophia' });
  const liste = el('div', { class: 'm-pieces' });
  const msg = el('p', { class: 'c-msg', role: 'alert' });
  const caseInfo = el('input', { type: 'checkbox', id: 'm-info' });
  const caseUrgent = el('input', { type: 'checkbox', id: 'm-urgent' });
  // Une info ne demande rien : elle ne peut pas être urgente.
  caseInfo.addEventListener('change', () => { if (caseInfo.checked) caseUrgent.checked = false; });
  caseUrgent.addEventListener('change', () => { if (caseUrgent.checked) caseInfo.checked = false; });
  const choixFichier = el('input', { type: 'file', multiple: true, hidden: true, onchange: (e) => { ajouterFichiers(e.target.files); e.target.value = ''; } });
  const envoyer = el('button', { class: 'm-envoyer', type: 'button', 'aria-label': 'Envoyer' }, [icone('envoyer'), el('span', null, 'Envoyer')]);

  const ajuster = () => { zone.style.height = 'auto'; zone.style.height = Math.min(zone.scrollHeight, 220) + 'px'; };
  zone.addEventListener('input', ajuster);
  zone.addEventListener('keydown', (e) => {
    // À l'ordinateur, Entrée envoie (Maj + Entrée pour aller à la ligne), comme une messagerie.
    if (e.key === 'Enter' && !e.shiftKey && grandEcran()) { e.preventDefault(); partir(); }
  });
  zone.addEventListener('paste', (e) => {
    const f = e.clipboardData && e.clipboardData.files;
    if (f && f.length) { e.preventDefault(); ajouterFichiers(f); }
  });

  function rendrePieces() {
    liste.innerHTML = '';
    COMPO.pieces.forEach((p, i) => liste.append(el('span', { class: 'm-pj' }, [
      icone(p.fichier ? 'note' : 'lien'),
      el('span', { class: 'm-nom' }, p.fichier ? p.fichier.name : p.url),
      p.fichier ? el('small', null, taille(p.fichier.size)) : null,
      el('button', { type: 'button', 'aria-label': 'Retirer', onclick: () => { COMPO.pieces.splice(i, 1); rendrePieces(); } }, icone('non')),
    ])));
  }
  function ajouterFichiers(fl) {
    msg.textContent = '';
    Array.from(fl || []).forEach(f => {
      if (f.size > TAILLE_MAX) { msg.textContent = f.name + ' : trop lourd (30 Mo au plus). Mets-le dans le Drive et colle son lien.'; return; }
      COMPO.pieces.push({ fichier: f });
    });
    rendrePieces();
    zone.focus();
  }
  COMPO.ajouter = ajouterFichiers;

  async function partir() {
    msg.textContent = '';
    const texte = zone.value;
    const { titre, mot, liens } = decouperMessage(texte, COMPO.pieces);
    if (!titre) { msg.textContent = 'Écris ton message, ou joins un fichier.'; zone.focus(); return; }
    const pieces = COMPO.pieces.concat(liens.map(u => ({ url: u })));
    envoyer.disabled = true; zone.disabled = true;
    const lib = $('span', envoyer);
    try {
      const prets = await televerserTout(pieces, (i, n) => { lib.textContent = n > 1 ? 'Fichier ' + i + '/' + n : 'Envoi...'; });
      lib.textContent = 'Envoi...';
      const q = { type: caseInfo.checked ? 'info' : 'message', titre, pieces: prets };
      if (mot) q.mot = mot;
      if (caseUrgent.checked) q.urgent = true;
      const r = await SOURCE.deposer(q);
      zone.value = ''; ajuster(); COMPO.pieces = []; rendrePieces();
      caseInfo.checked = false; caseUrgent.checked = false;
      await SOURCE.recharger();
      toast(q.type === 'info' ? 'Envoyé pour info.' : 'Envoyé.' + (r && r.alertes ? ' Sophia est prévenue.' : ''));
    } catch (err) {
      msg.textContent = err.message === 'hors-ligne' ? "Pas de connexion, rien n'est parti." : err.message;
    }
    envoyer.disabled = false; zone.disabled = false; lib.textContent = 'Envoyer';
  }
  envoyer.addEventListener('click', partir);

  z = el('div', { id: 'composeur', class: 'composeur' }, [
    zone, liste,
    el('div', { class: 'm-bas' }, [
      el('button', { class: 'm-trombone', type: 'button', 'aria-label': 'Joindre un fichier', title: 'Joindre un fichier', onclick: () => choixFichier.click() }, icone('trombone')),
      el('label', { class: 'm-case' }, [caseInfo, el('span', null, 'Info')]),
      el('label', { class: 'm-case urgent' }, [caseUrgent, el('span', null, 'Urgent')]),
      envoyer,
    ]),
    msg, choixFichier,
  ]);
  $('#vue-trancher').insertBefore(z, $('#filtres'));
  preparerGlisser();
}

// Glisser un fichier n'importe où dans la fenêtre : sur un rendez-vous de l'agenda, il s'y
// rattache ; ailleurs, il rejoint le message en cours.
let GLISSE = 0;
function preparerGlisser() {
  if (preparerGlisser.fait) return;
  preparerGlisser.fait = true;
  const voile = el('div', { class: 'voile-glisser', hidden: true }, el('div', null, [icone('trombone'), el('span', null, 'Lâche le fichier pour l\'ajouter à ton message')]));
  document.body.appendChild(voile);
  const avecFichiers = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => { if (estDeputee() || !avecFichiers(e)) return; GLISSE++; voile.hidden = false; });
  window.addEventListener('dragleave', () => { if (--GLISSE <= 0) { GLISSE = 0; voile.hidden = true; } });
  window.addEventListener('dragover', (e) => {
    if (estDeputee() || !avecFichiers(e)) return;
    e.preventDefault();
    const evt = e.target.closest && e.target.closest('.evt[data-id]');
    $$('.evt.cible').forEach(x => { if (x !== evt) x.classList.remove('cible'); });
    if (evt) evt.classList.add('cible');
    voile.classList.toggle('sur-rdv', !!evt);
  });
  window.addEventListener('drop', (e) => {
    if (estDeputee() || !avecFichiers(e)) return;
    e.preventDefault();
    GLISSE = 0; voile.hidden = true;
    const evt = e.target.closest && e.target.closest('.evt[data-id]');
    $$('.evt.cible').forEach(x => x.classList.remove('cible'));
    if (evt) joindreAuRdv(evt.dataset.id, e.dataTransfer.files);
    else if (COMPO.ajouter) COMPO.ajouter(e.dataTransfer.files);
  });
}

// v6 : « Pour l'agenda » quitte le formulaire ; on joint au rendez-vous depuis l'agenda.
async function joindreAuRdv(id, fichiers) {
  const e = S.agenda.find(x => x.id === id);
  const fl = Array.from(fichiers || []);
  if (!e || !fl.length) return;
  const trop = fl.find(f => f.size > TAILLE_MAX);
  if (trop) { toast(trop.name + ' : trop lourd (30 Mo au plus).'); return; }
  toast('Envoi vers « ' + e.titre + ' »...');
  try {
    const prets = await televerserTout(fl.map(f => ({ fichier: f })));
    await SOURCE.deposerDoc({ evenement: id, titre: '', pieces: prets });
    await SOURCE.recharger();
    rendreAgenda();
    toast(fl.length > 1 ? fl.length + ' fichiers joints au rendez-vous.' : 'Joint au rendez-vous.');
  } catch (err) { toast(err.message === 'hors-ligne' ? "Pas de connexion, rien n'est parti." : err.message); }
}
function choisirPourRdv(id) {
  const i = el('input', { type: 'file', multiple: true, hidden: true, onchange: (ev) => { joindreAuRdv(id, ev.target.files); i.remove(); } });
  document.body.appendChild(i);
  i.click();
}
