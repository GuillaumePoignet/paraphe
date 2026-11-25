// sw.js - service de fond de l'appli « Paraphe », ex « À décider » (v2, 24/11/2026 ; v6, 25/11/2026).
// 1. Reçoit les alertes Firebase quand l'appli est fermée et les affiche ;
//    un toucher ouvre la demande (lien fourni par le serveur).
// 2. Garde une copie des fichiers de l'appli : elle s'ouvre même sans réseau.
importScripts('config.js', 'lib/firebase-app-compat.js', 'lib/firebase-messaging-compat.js');

const CFG = self.CONFIG_A_DECIDER || {};
if (CFG.firebase) {
  firebase.initializeApp(CFG.firebase);
  firebase.messaging();
}

const CACHE = 'paraphe-v7';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord, copie gardée en secours, pour les fichiers de l'appli seulement.
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
