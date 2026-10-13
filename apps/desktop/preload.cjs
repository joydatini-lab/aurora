// preload.cjs — surface minimale exposée au renderer (contextBridge).
//
// Voie A (WASQLite dans le renderer) ne nécessite AUCUNE API native :
// `@powersync/web` gère la base directement dans le renderer. Le preload
// existe quand même, vide (juste une bannière de version), pour prouver
// la règle « le renderer n'a que ce que le preload expose » — et pour
// servir de point d'ancrage si la voie B (`@powersync/node` dans le main
// process, IPC étroite) est retenue au test (check #4 du plan : zéro
// `require('fs')`/`child_process` dans le bundle renderer).

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('auroraDesktop', {
  // La voie B n'est pas encore activée : rien n'est exposé aujourd'hui.
  // Quand elle le sera, c'est ici que vit l'API typée `data:query` /
  // `data:write` (jamais de SQL arbitraire envoyé par le renderer).
  version: '0.0.0-spike',
});
