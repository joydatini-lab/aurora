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

  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
