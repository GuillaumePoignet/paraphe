// p7_deposer - écran « Déposer » de l'équipe.
// v2 (24/11/2026) : l'équipe dépose ici ; Claude dépose par le même serveur.
// v3 (24/11/2026, JL : « C'est des vrai fichier qui doivent etre dans les note de
// rdv ou a controle, ou des liens google » ; arbitrages : « Fichier ou lien Google »,
// « Titre, échéance, un mot facultatif ») : plus rien à recopier, on joint la pièce.

const FORMES = {
  courrier: { lib: 'Courrier', creneau: false },
  rdv: { lib: 'Rendez-vous', creneau: true },
  media: { lib: 'Média', creneau: true },
  video: { lib: 'Vidéo', creneau: false },
  tweet: { lib: 'Réseaux', creneau: false },
  note: { lib: 'Autre', creneau: false },
  // v4 (24/11/2026, JL : « parfois ce sont juste des infos, et elle a rien a valider »)
  info: { lib: 'Pour info', creneau: false, sansEcheance: true },
  noteAgenda: { lib: "Pour l'agenda", creneau: false },
};
const TAILLE_MAX = 30 * 1024 * 1024;

function rendreBoutonDeposer() {
  let b = $('#btn-deposer');
  if (estDeputee()) { if (b) b.remove(); return; }
  if (!b) {
    b = el('button', { id: 'btn-deposer', class: 'fab', onclick: () => ouvrirDeposer() }, [icone('plus'), 'Déposer']);
    document.body.appendChild(b);
  }
}

function champ(lib, entree, aide) {
  return el('label', { class: 'champ' }, [el('span', { class: 'lib' }, lib), entree, aide ? el('span', { class: 'aide' }, aide) : null]);
}
function saisie(id, type, ph, val) { return el('input', { id, type: type || 'text', placeholder: ph || '', value: val || '' }); }
function aujourdhuiPlus(j, h) { const d = ajouterJours(debutJour(maintenant()), j); d.setHours(h, 0, 0, 0); return d; }
function dateLocale(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function valeur(id) { const z = $('#' + id); return z ? z.value.trim() : ''; }
function versIso(dateId, heureId) { const d = valeur(dateId), h = valeur(heureId) || '00:00'; return d ? new Date(d + 'T' + h).toISOString() : ''; }
function lireBase64(fichier) {
  return new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] || '');
    r.onerror = () => ko(new Error('Lecture du fichier impossible'));
    r.readAsDataURL(fichier);
  });
}
function taille(o) { return o > 1048576 ? (o / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(o / 1024)) + ' Ko'; }

function ouvrirDeposer(typeInitial) {
  const E = $('#deposer');
  E.innerHTML = '';
  let type = typeInitial || 'courrier';
  const pieces = [];   // { fichier } ou { url }
  const corps = el('div', { class: 'corps' });
  const formulaire = el('div', { class: 'formulaire' });
  const liste = el('div', { class: 'pieces-jointes' });
  const msg = el('p', { class: 'c-msg', role: 'alert' });
  const envoyer = el('button', { class: 'envoyer', style: { background: 'var(--violet)' } }, 'Déposer');

  function rendrePieces() {
    liste.innerHTML = '';
    pieces.forEach((p, i) => liste.append(el('div', { class: 'pj' }, [
      icone(p.fichier ? 'note' : 'lien'),
      el('span', null, p.fichier ? p.fichier.name + ' (' + taille(p.fichier.size) + ')' : p.url),
      el('button', { 'aria-label': 'Retirer', onclick: () => { pieces.splice(i, 1); rendrePieces(); } }, icone('non')),
    ])));
  }
  function ajouterFichiers(liste) {
    Array.from(liste || []).forEach(f => {
      if (f.size > TAILLE_MAX) { msg.textContent = f.name + ' : trop lourd (30 Mo au plus). Mets-le dans le Drive et colle son lien.'; return; }
      pieces.push({ fichier: f });
    });
    rendrePieces();
  }
  const choixFichier = el('input', { type: 'file', id: 'f-fichier', multiple: true, hidden: true, onchange: (e) => { ajouterFichiers(e.target.files); e.target.value = ''; } });
  const lien = saisie('f-lien', 'url', 'Coller un lien Google (Docs, Drive...)');
  const ajouterLien = () => {
    const u = lien.value.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) { msg.textContent = 'Le lien doit commencer par https://'; return; }
    pieces.push({ url: u }); lien.value = ''; msg.textContent = ''; rendrePieces();
  };
  lien.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterLien(); } });
  // v5 (JL : « côté collab, ça va être beaucoup plus via l'ordinateur ») : on peut aussi glisser les fichiers.
  const blocPieces = el('div', { class: 'champ depot-zone',
    ondragover: (e) => { e.preventDefault(); e.currentTarget.classList.add('survol'); },
    ondragleave: (e) => e.currentTarget.classList.remove('survol'),
    ondrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove('survol'); ajouterFichiers(e.dataTransfer && e.dataTransfer.files); } }, [
    el('span', { class: 'lib' }, 'Pièces'),
    grandEcran() ? el('span', { class: 'aide' }, 'Glisse les fichiers ici, ou :') : null,
    el('div', { class: 'boutons-pj' }, [
      el('button', { class: 'bouton-lien', type: 'button', onclick: () => choixFichier.click() }, [icone('plus'), 'Joindre un fichier']),
    ]),
    el('div', { class: 'ligne-lien' }, [lien, el('button', { type: 'button', class: 'ajout-lien', onclick: ajouterLien }, 'Ajouter')]),
    liste, choixFichier,
  ]);

  const choixType = el('div', { class: 'puces types' }, Object.keys(FORMES).map(k =>
    el('button', { 'data-type': k, class: k === type ? 'choisie' : null, onclick: () => { type = k; $$('.types button', E).forEach(b => b.classList.toggle('choisie', b.dataset.type === k)); remplir(); } }, FORMES[k].lib)));

  function remplir() {
    formulaire.innerHTML = '';
    if (type === 'noteAgenda') {
      const evts = S.agenda.filter(e => !e.journee && new Date(e.fin) > maintenant()).sort((a, b) => new Date(a.debut) - new Date(b.debut));
      formulaire.append(champ('Rendez-vous', el('select', { id: 'f-evt' }, [el('option', { value: '' }, 'Choisis le rendez-vous')].concat(evts.map(e =>
        el('option', { value: e.id }, majuscule(nomJour(e.debut)) + ' ' + heure(e.debut) + ' - ' + e.titre))))));
      formulaire.append(champ('Titre (facultatif)', saisie('f-titre', 'text', 'Note de rendez-vous, questions...')));
      formulaire.append(blocPieces);
      envoyer.textContent = "Ajouter à l'agenda";
      return;
    }
    // v5 (JL : « il puisse cocher urgent pour que ça le remonte »).
    if (!FORMES[type].sansEcheance) formulaire.append(el('label', { class: 'case-urgent' }, [el('input', { type: 'checkbox', id: 'f-urgent' }),
      el('span', null, [el('b', null, 'Urgent'), ' - passe en tête chez Sophia']) ]));
    formulaire.append(champ('Titre', saisie('f-titre', 'text', FORMES[type].sansEcheance ? 'Ce que Sophia doit savoir, en quelques mots' : 'Ce que Sophia doit décider, en quelques mots')));
    formulaire.append(blocPieces);
    if (FORMES[type].creneau) {
      const d = aujourdhuiPlus(1, 10);
      formulaire.append(el('div', { class: 'ligne-champs' }, [
        champ('Jour', saisie('f-jour', 'date', '', dateLocale(d))),
        champ('De', saisie('f-debut', 'time', '', '10:00')),
        champ('À', saisie('f-fin', 'time', '', '11:00')),
      ]));
      formulaire.append(champ('Lieu', saisie('f-lieu', 'text', 'Permanence, 20e')));
    }
    const e = aujourdhuiPlus(1, 18);
    if (!FORMES[type].sansEcheance) formulaire.append(el('div', { class: 'ligne-champs' }, [
      champ('Réponse attendue le', saisie('f-ech-jour', 'date', '', dateLocale(e))),
      champ('avant', saisie('f-ech-heure', 'time', '', '18:00')),
    ]));
    formulaire.append(champ('Un mot pour Sophia (facultatif)', el('textarea', { id: 'f-mot', rows: '2', placeholder: 'Ce qu\'il faut savoir, ou ton avis, en une phrase' })));
    envoyer.textContent = FORMES[type].sansEcheance ? 'Envoyer pour info' : 'Déposer pour Sophia';
  }

  // Les fichiers partent d'abord un par un dans le Drive ; la demande part ensuite avec leurs liens.
  async function preparerPieces() {
    const prets = [];
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.url) { prets.push({ url: p.url }); continue; }
      envoyer.textContent = 'Envoi du fichier ' + (i + 1) + ' sur ' + pieces.length + '...';
      const r = await SOURCE.televerser(p.fichier.name, p.fichier.type, await lireBase64(p.fichier));
      prets.push(r.piece);
    }
    return prets;
  }

  envoyer.addEventListener('click', async () => {
    msg.textContent = '';
    ajouterLien();
    if (type === 'noteAgenda' && !valeur('f-evt')) { msg.textContent = 'Choisis le rendez-vous.'; return; }
    if (type !== 'noteAgenda' && !valeur('f-titre')) { msg.textContent = 'Il manque le titre.'; return; }
    if (!pieces.length && type === 'noteAgenda') { msg.textContent = 'Joins un fichier ou colle un lien.'; return; }
    envoyer.disabled = true;
    try {
      const prets = await preparerPieces();
      envoyer.textContent = 'Dépôt...';
      let r;
      if (type === 'noteAgenda') r = await SOURCE.deposerDoc({ evenement: valeur('f-evt'), titre: valeur('f-titre'), pieces: prets });
      else {
        const q = { type: type === 'noteAgenda' ? 'note' : type, titre: valeur('f-titre'), echeance: versIso('f-ech-jour', 'f-ech-heure'), pieces: prets };
        const mot = valeur('f-mot'); if (mot) q.mot = mot;
        if ($('#f-urgent') && $('#f-urgent').checked) q.urgent = true;
        if (FORMES[type].creneau) q.creneau = { debut: versIso('f-jour', 'f-debut'), fin: versIso('f-jour', 'f-fin'), lieu: valeur('f-lieu') };
        if (FORMES[type].sansEcheance) q.echeance = new Date().toISOString();
        if (!q.echeance) throw new Error("Il manque l'échéance.");
        r = await SOURCE.deposer(q);
      }
      depiler();
      await SOURCE.recharger();
      toast(type === 'noteAgenda' ? "Ajouté à l'agenda." : 'Déposé.' + (r && r.alertes ? ' Sophia est prévenue.' : ''));
    } catch (err) {
      msg.textContent = err.message === 'hors-ligne' ? "Pas de connexion, rien n'est parti." : err.message;
      envoyer.disabled = false; envoyer.textContent = 'Réessayer';
    }
  });

  remplir();
  const pole = POLES[S.moi && S.moi.pole] || POLES.cabinet;
  corps.append(el('h1', null, 'Déposer'), el('p', { class: 'meta' }, ['Pôle ', el('b', { class: 'pole', style: { '--c': pole.c } }, pole.lib)]), choixType, formulaire, msg, envoyer);
  E.append(el('div', { class: 'barre' }, [el('button', { class: 'retour', onclick: () => depiler() }, [icone('retour'), 'Retour'])]), el('div', { class: 'defile' }, corps));
  E.hidden = false; $('#voile-ecran').hidden = false;
  empiler(() => { E.hidden = true; $('#voile-ecran').hidden = $('#fiche').hidden && $('#lecteur').hidden && $('#histo').hidden; });
}
