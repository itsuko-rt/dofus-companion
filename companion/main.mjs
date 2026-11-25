// Atlas Companion, phase 3: finds the DOFUS windows through the OS window list, reads the character from each
// window title, and captures the game window on demand, by hotkey or at an interval (off by default).
// Read-only: it never touches the game's process, memory, network or input. Nothing leaves this PC.
import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseDofusTitle } from '../src/game-window.ts';

if (!app.requestSingleInstanceLock()) app.quit();

const DIR = app.getPath('userData');
const SETTINGS = join(DIR, 'settings.json');
const LOG = join(DIR, 'events.jsonl');
const MODES = ['observation', 'assisted', 'automatic'];
const HOTKEY_CAPTURE = 'CommandOrControl+Shift+F9';
const HOTKEY_STOP = 'CommandOrControl+Shift+F12';
const KEEP_DAYS = 30;

const settings = { mode: 'assisted', intervalSec: 0, ...readJson(SETTINGS) };
if (!MODES.includes(settings.mode)) settings.mode = 'assisted';
settings.intervalSec = clampInterval(settings.intervalSec);

const state = {
  stopped: false,
  windows: [],          // [{ sourceId, title, version, character }]
  activeId: null,       // sourceId of the window treated as active
  lastCapture: null,    // { at, width, height, darkShare, preview, error? }
  events: [],           // newest first, the last 50
};
let ui = null, tray = null, watchTimer = null, intervalTimer = null;

function readJson(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; } }
function clampInterval(v) { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 5 && n <= 3600 ? n : 0; }
function saveSettings() { writeFileSync(SETTINGS, JSON.stringify(settings, null, 2)); }

/** Time-sortable unique id (timestamp + random), for idempotent writes on the site later. */
const eventId = () => Date.now().toString(36).padStart(10, '0') + randomBytes(8).toString('hex');

function record(type, data) {
  const e = { eventId: eventId(), at: new Date().toISOString(), type, ...data, status: 'new' };
  appendFileSync(LOG, JSON.stringify(e) + '\n');
  state.events.unshift(e);
  state.events.length = Math.min(state.events.length, 50);
  push();
  return e;
}

function pruneLog() {
  if (!existsSync(LOG)) return;
  const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
  const keep = readFileSync(LOG, 'utf8').split('\n').filter((l) => { try { return Date.parse(JSON.parse(l).at) >= cutoff; } catch { return false; } });
  writeFileSync(LOG, keep.length ? keep.join('\n') + '\n' : '');
  state.events = keep.slice(-50).reverse().map((l) => JSON.parse(l));
}

/** Every 2 s: the DOFUS windows and the character each one shows. A new character in a window is an event. */
async function watch() {
  let sources;
  try { sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 }, fetchWindowIcons: false }); }
  catch { return; }
  const before = new Map(state.windows.map((w) => [w.sourceId, w]));
  const windows = sources.flatMap((s) => { const g = parseDofusTitle(s.name); return g ? [{ sourceId: s.id, title: s.name, ...g }] : []; });
  for (const w of windows) {
    const old = before.get(w.sourceId);
    const changed = !old || old.character?.name !== w.character?.name;
    if (changed && w.character) {
      // shortcut: the OS window list does not say which window is in front; with several DOFUS windows the one whose
      // character changed last is active, and the player can pick another in the companion window. Upgrade with a
      // foreground-window check if multi-account players need it.
      state.activeId = w.sourceId;
      record('character.seen', {
        characterKey: w.character.name, className: w.character.className, breedId: w.character.breedId,
        gameVersion: w.version, confidence: 1, evidence: { source: 'window-title' },
      });
    }
  }
  if (!windows.some((w) => w.sourceId === state.activeId)) state.activeId = windows.find((w) => w.character)?.sourceId ?? windows[0]?.sourceId ?? null;
  const same = JSON.stringify(windows) === JSON.stringify(state.windows);
  state.windows = windows;
  if (!same) { push(); updateTray(); }
}

/** One frame of the active DOFUS window, kept in memory only (phase 4 reads it with the OCR). */
async function capture(trigger) {
  if (state.stopped) return state.lastCapture;
  const w = state.windows.find((x) => x.sourceId === state.activeId);
  if (!w) { state.lastCapture = { at: new Date().toISOString(), trigger, error: 'Aucune fenêtre DOFUS trouvée.' }; push(); return state.lastCapture; }
  const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 3840, height: 2160 }, fetchWindowIcons: false });
  const img = sources.find((s) => s.id === w.sourceId)?.thumbnail;
  const at = new Date().toISOString();
  if (!img || img.isEmpty()) {
    state.lastCapture = { at, trigger, error: 'Windows n’a renvoyé aucune image : la fenêtre est peut-être réduite.' };
  } else {
    const { width, height } = img.getSize();
    const darkShare = darkPixels(img);
    state.lastCapture = {
      at, trigger, width, height, darkShare, character: w.character?.name ?? null,
      // a black frame means Windows could not see the window (minimised, or covered on some setups): never read it
      error: darkShare > 0.98 ? 'Image presque noire : la fenêtre est réduite ou masquée, rien n’est lu.' : undefined,
      preview: img.resize({ width: 480 }).toDataURL(),
    };
  }
  push();
  return state.lastCapture;
}

function darkPixels(img) {
  const small = img.resize({ width: 160 });
  const px = small.toBitmap(); // BGRA
  let dark = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] < 30) dark++;
  return dark / (px.length / 4);
}

function setStopped(v) {
  state.stopped = v;
  clearInterval(watchTimer); clearInterval(intervalTimer);
  watchTimer = intervalTimer = null;
  if (!v) { watchTimer = setInterval(watch, 2000); watch(); scheduleInterval(); }
  record(v ? 'companion.stopped' : 'companion.resumed', { confidence: 1, evidence: { source: 'player' } });
  updateTray();
}

function scheduleInterval() {
  clearInterval(intervalTimer); intervalTimer = null;
  if (!state.stopped && settings.intervalSec) intervalTimer = setInterval(() => capture('interval'), settings.intervalSec * 1000);
}

function snapshot() {
  return { ...state, settings, hotkeys: { capture: HOTKEY_CAPTURE, stop: HOTKEY_STOP }, logPath: LOG };
}
function push() { ui?.webContents.send('state', snapshot()); }

function updateTray() {
  if (!tray) return;
  const active = state.windows.find((w) => w.sourceId === state.activeId)?.character;
  tray.setToolTip(state.stopped ? 'Atlas Companion : arrêté' : active ? `Atlas Companion : ${active.name}` : 'Atlas Companion : DOFUS non détecté');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Ouvrir', click: showUi },
    { label: 'Capturer maintenant', enabled: !state.stopped, click: () => capture('menu') },
    { label: state.stopped ? 'Reprendre' : 'Arrêt d’urgence', click: () => setStopped(!state.stopped) },
    { type: 'separator' },
    { label: 'Quitter', click: () => app.quit() },
  ]));
}

function showUi() {
  if (ui) { ui.show(); ui.focus(); return; }
  ui = new BrowserWindow({
    width: 560, height: 760, title: 'Atlas Companion', autoHideMenuBar: true,
    icon: join(import.meta.dirname, '../public/favicon-192x192.png'),
    webPreferences: { preload: join(import.meta.dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  ui.loadFile(join(import.meta.dirname, 'ui.html'));
  ui.webContents.on('did-finish-load', push);
  ui.on('closed', () => { ui = null; });
}

ipcMain.handle('capture', () => capture('button'));
ipcMain.handle('stop', (_e, v) => { setStopped(!!v); return snapshot(); });
ipcMain.handle('set', (_e, patch) => {
  if (patch && MODES.includes(patch.mode)) settings.mode = patch.mode;
  if (patch && 'intervalSec' in patch) settings.intervalSec = clampInterval(patch.intervalSec);
  if (patch && typeof patch.activeId === 'string' && state.windows.some((w) => w.sourceId === patch.activeId)) state.activeId = patch.activeId;
  saveSettings(); scheduleInterval(); push();
  return snapshot();
});

app.on('second-instance', showUi);
app.on('window-all-closed', () => { /* keep running in the tray */ });
app.on('will-quit', () => globalShortcut.unregisterAll());
const SELF_TEST = process.argv.includes('--self-test');
app.whenReady().then(() => {
  if (SELF_TEST) return selfTest();
  pruneLog();
  tray = new Tray(nativeImage.createFromPath(join(import.meta.dirname, '../public/favicon-32x32.png')));
  tray.on('click', showUi);
  globalShortcut.register(HOTKEY_CAPTURE, () => capture('hotkey'));
  globalShortcut.register(HOTKEY_STOP, () => setStopped(!state.stopped));
  watchTimer = setInterval(watch, 2000);
  watch(); scheduleInterval(); updateTray(); showUi();
});

// `electron . --self-test` prints what it sees (classes and versions, no character names), captures once in memory and
// quits: no window, no hotkey, nothing written except the event log
async function selfTest() {
  await watch();
  const c = await capture('self-test');
  console.log(JSON.stringify({
    windows: state.windows.map((w) => ({ version: w.version, className: w.character?.className ?? null, breedId: w.character?.breedId ?? null, hasCharacter: !!w.character })),
    capture: c && { width: c.width, height: c.height, darkShare: c.darkShare && Math.round(c.darkShare * 1000) / 1000, error: c.error ?? null },
    events: state.events.map((e) => e.type),
  }));
  app.exit(0);
}
