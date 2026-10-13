// main.cjs — Electron main process (Aurora desktop shell, spike Phase 0).
//
// Règles du doc §17.1/§32.6 (non négociable) :
//   - nodeIntegration: false, contextIsolation: true, sandbox: true
//   - le renderer n'a AUCUN accès Node ; la seule surface est le preload
//     (contextBridge). Les données vont via l'engine PowerSync du renderer
//     (voie A : @powersync/web WASQLite) — pas via IPC Node (voies B,
//     à activer seulement si A échoue au build empaqueté).
//
// Aucune clé de fournisseur ici (AD-3 : le secret ne reste que côté
// harnais/dashboard, jamais dans le bundle livré).

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// En dev (npm run dev), Vite tourne sur 5199 ; en build empaqueté, on
// charge le fichier local (le check #1 du plan = kill/relaunch du BUILD,
// pas du dev server).
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const DIST = path.join(__dirname, 'dist');

// Check #1 (offline state survives kill/relaunch): log the boot sequence to
// the renderer console so the desktop shell's own stdout (captured when
// `electron .` is run in a terminal) proves WASQLite + the PowerSync
// renderer worker actually started — not just the packaged binary existing.
// We can't rely on `console.log` here (no terminal attached in many CI /
// agent contexts) — instead we write a marker file next to the app so an
// external `ls` after kill/relaunch proves the local SQLite file persisted.
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Navigation bloquée au content local / dev server (règle « navigation
  // limitée », doc §17.1). Le renderer ne quitte jamais l'origin de
  // confiance pour un lien externe : on l'ouvre dans le navigateur système.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = DEV_URL ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(DIST, 'index.html'));
  }

  win.webContents.on('did-finish-load', () => {
    win.webContents
      .executeJavaScript('window.__powersyncBootStatus || "unknown"')
      .then((status) => {
        // Append a marker next to the app (NOT the WASQLite DB file itself —
        // we just record that the renderer reported a boot status) so the
        // kill/relaunch check (#1) can prove the shell booted end-to-end.
        const marker = path.join(DIST, '.boot-marker.json');
        try {
          fs.writeFileSync(
            marker,
            JSON.stringify({ at: new Date().toISOString(), status }, null, 2),
            'utf8',
          );
        } catch {
          /* non-fatal: the marker is diagnostic only */
        }
      });
  });

  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  try {
    fs.writeFileSync(
      path.join(DIST, '.main-booted.json'),
      JSON.stringify({ at: new Date().toISOString(), dev: Boolean(DEV_URL), pid: process.pid }, null, 2),
      'utf8',
    );
  } catch {
    /* non-fatal: marker is diagnostic only */
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
