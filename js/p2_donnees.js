// p2_donnees - EXEMPLES FICTIFS pour la version d'essai (23/11/2026).
// v2 (24/11/2026) : même forme de données que le serveur (SOURCE).
// v3 (24/11/2026) : pièces jointes au lieu de textes recopiés.
// v5 (24/11/2026) : pôles (Cabinet, Com, Légistique), urgent, pièces d'exemple
// lisibles dans la visionneuse (FICHIERS_EXEMPLE, ajoutés par la construction),
// agenda d'exemple sur tous les jours, pour le défilement sans fin.
// Aucune personne réelle, aucun chiffre réel.

function aJour(decalage, h, m) {
  const d = ajouterJours(debutJour(maintenant()), decalage);
  d.setHours(h, m || 0, 0, 0);
  return d.toISOString();
}
function ilYa(minutes) { return new Date(maintenant() - minutes * 60000).toISOString(); }
// exemple = clé d'un fichier de FICHIERS_EXEMPLE (sinon, la pièce n'a pas de vrai fichier).
function pieceExemple(nom, exemple, mime) { return { nom, titre: nom, mime: mime || '', exemple: exemple || '', ouvrir: '#' }; }

// Agenda d'exemple : quelques rendez-vous fixes autour d'aujourd'hui, puis une semaine type pour les autres jours.
function agendaExemple(k) {
  const fixes = {
    0: [{ titre: "Point d'équipe du matin", lieu: 'Permanence, 20e', h: [9, 0, 9, 45], docs: [pieceExemple('Ordre du jour', 'note')] },
        { titre: 'Rendez-vous avec le collectif de locataires Exemple', lieu: 'Permanence, 20e', h: [10, 30, 11, 30], docs: [pieceExemple('Note de rendez-vous', 'note')] },
        { titre: 'Séance publique', lieu: 'Assemblée nationale', h: [15, 0, 19, 0] },
        { titre: 'Interview radio - Radio Exemple', lieu: 'Studio, 11e', h: [19, 30, 20, 0], docs: [pieceExemple("Questions de l'interview", 'questions')] }],
    1: [{ titre: 'Commission des affaires étrangères', lieu: 'Assemblée nationale', h: [9, 0, 11, 0] },
        { titre: 'Déjeuner avec une élue du 11e', lieu: 'Restaurant, 11e', h: [12, 30, 14, 0], docs: [pieceExemple('Note de rendez-vous', 'note')] },
        { titre: 'Permanence parlementaire', lieu: 'Permanence, 20e', h: [17, 0, 19, 0], docs: [pieceExemple('Dossiers du jour', 'note')] }],
    2: [{ titre: 'Conseil de Paris', lieu: 'Hôtel de Ville', journee: true }],
    3: [{ titre: 'Réunion publique', lieu: 'Salle municipale, 20e', h: [19, 0, 21, 30], docs: [pieceExemple("Trame d'intervention", 'note')] }],
    4: [{ titre: "Visite d'une école", lieu: '11e', h: [10, 0, 11, 30] }],
  };
  const type = {
    1: [{ titre: "Réunion d'équipe", lieu: 'Permanence, 20e', h: [9, 30, 10, 30] }, { titre: 'Questions au gouvernement', lieu: 'Assemblée nationale', h: [15, 0, 16, 0] }],
    2: [{ titre: 'Commission des affaires étrangères', lieu: 'Assemblée nationale', h: [9, 30, 12, 0] }, { titre: 'Rendez-vous associatif', lieu: 'Permanence, 20e', h: [17, 0, 18, 0] }],
    3: [{ titre: 'Groupe parlementaire', lieu: 'Assemblée nationale', h: [10, 0, 12, 0] }, { titre: 'Séance publique', lieu: 'Assemblée nationale', h: [15, 0, 19, 0] }],
    4: [{ titre: 'Permanence parlementaire', lieu: 'Permanence, 20e', h: [14, 0, 17, 0] }],
    5: [{ titre: 'Rencontre de quartier', lieu: '20e', h: [18, 30, 20, 0] }],
    6: [{ titre: 'Marché du quartier', lieu: '11e', h: [10, 0, 11, 30] }],
    0: [],
  };
  const jour = ajouterJours(debutJour(maintenant()), k);
  const liste = fixes[k] || type[jour.getDay()];
  return liste.map((e, i) => e.journee
    ? { id: 'x' + k + '-' + i, titre: e.titre, lieu: e.lieu, journee: true, debut: aJour(k, 0), fin: aJour(k + 1, 0), docs: [] }
    : { id: 'x' + k + '-' + i, titre: e.titre, lieu: e.lieu, debut: aJour(k, e.h[0], e.h[1]), fin: aJour(k, e.h[2], e.h[3]), docs: e.docs || [] });
}

function donneesExemple() {
  const agenda = [];
  for (let k = S.agPlage.de; k <= S.agPlage.a; k++) agenda.push(...agendaExemple(k));

  const demandes = [
    { id: 'q1', type: 'courrier', pole: 'cabinet', urgent: true, depose_par: 'Guillaume', depose_le: ilYa(95), echeance: aJour(0, 20),
      titre: 'Courrier au préfet de police pour Madame B., titre de séjour',
      mot: 'Prêt à partir, sur le modèle des courriers déjà envoyés au préfet.',
      pieces: [pieceExemple('2026_11_24_Courrier_Prefet_Madame_B.pdf', 'courrier')] },
    { id: 'q2', type: 'tweet', pole: 'com', depose_par: 'Communication', depose_le: ilYa(40), echeance: aJour(1, 11),
      titre: 'Visuel et message pour annoncer la permanence',
      pieces: [pieceExemple('Visuel permanence.png', 'visuel', 'image/png')] },
    { id: 'q3', type: 'rdv', pole: 'cabinet', depose_par: 'Guillaume', depose_le: ilYa(180), echeance: aJour(1, 18),
      titre: "Rendez-vous avec l'association Exemple du 20e",
      creneau: { debut: aJour(3, 10, 0), fin: aJour(3, 11, 0), lieu: 'Permanence, 20e' },
      mot: 'Plutôt oui. Première demande de leur part, sur les loyers du quartier.' },
    { id: 'q8', type: 'note', pole: 'legistique', depose_par: 'Légistique', depose_le: ilYa(60), echeance: aJour(2, 12),
      titre: 'Amendement sur le projet de loi Exemple, article 3',
      mot: 'À déposer avant jeudi midi. Cosignatures du groupe en cours.',
      pieces: [pieceExemple('Amendement article 3.pdf', 'amendement')] },
    { id: 'q4', type: 'video', pole: 'com', depose_par: 'Communication', depose_le: ilYa(25), echeance: aJour(2, 9),
      titre: 'Vidéo courte sur la séance de mardi',
      pieces: [pieceExemple('Extrait séance.mp4', '', 'video/mp4')] },
    { id: 'q5', type: 'media', pole: 'com', depose_par: 'Communication', depose_le: ilYa(300), echeance: aJour(3, 12),
      titre: 'Invitation dans la matinale de Radio Exemple',
      creneau: { debut: aJour(1, 9, 15), fin: aJour(1, 9, 30), lieu: 'Studio, 11e' },
      mot: 'Radio locale, émission matinale. Audience à vérifier.' },
    // v4 : deux infos, sans rien à valider.
    { id: 'q6', type: 'info', pole: 'cabinet', depose_par: 'Guillaume', depose_le: ilYa(20), echeance: ilYa(20),
      titre: 'Compte rendu du conseil de quartier Exemple',
      pieces: [pieceExemple('Compte rendu conseil de quartier.pdf', 'note')] },
    { id: 'q7', type: 'info', pole: 'com', depose_par: 'Claude', depose_le: ilYa(150), echeance: ilYa(150),
      titre: 'Revue de presse de la circonscription',
      mot: 'Trois articles sur le 20e cette semaine.' },
  ];

  return { demandes, agenda };
}

function octetsBase64(b64) { const s = atob(b64), o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }

// Source des données de la version d'essai : tout reste dans la page.
const SOURCE = {
  mode: 'exemples',
  async demarrer() {
    const D = donneesExemple();
    S.demandes = D.demandes; S.agenda = D.agenda; S.moi = { nom: 'Sophia', role: 'deputee' };
    toutRendre();
    return true;
  },
  async recharger() { toutRendre(); },
  async decider() {},
  async annuler() {},
  async televerser(nom, mime) { return { ok: true, piece: pieceExemple(nom, '', mime) }; },
  async deposer(q) {
    q.id = 'q' + Date.now(); q.depose_par = S.moi.nom; q.depose_le = new Date().toISOString(); q.pole = S.moi.pole || 'cabinet';
    q.pieces = (q.pieces || []).map(p => p.url ? pieceExemple(p.url) : p);
    S.demandes.push(q); return { ok: true, id: q.id };
  },
  async deposerDoc(o) {
    const e = S.agenda.find(x => x.id === o.evenement);
    if (e) (e.docs = e.docs || []).push(...(o.pieces || []).map(p => p.url ? pieceExemple(o.titre || p.url) : p));
    return { ok: true };
  },
  async lirePiece(p) {
    const f = p.exemple && typeof FICHIERS_EXEMPLE !== 'undefined' && FICHIERS_EXEMPLE[p.exemple];
    if (!f) return { ouvrir: true, erreur: "Version d'essai : pas de vrai fichier derrière cet exemple." };
    return { mime: f.mime, octets: octetsBase64(f.b64) };
  },
  async chargerAgenda(debut, jours) {
    const k0 = ecartJours(debut, maintenant()), liste = [];
    for (let k = k0; k < k0 + jours; k++) liste.push(...agendaExemple(k));
    fusionnerAgenda(liste, debut, ajouterJours(debut, jours));
  },
  async abonner() { return { ok: true }; },
  deconnexion() {},
};
