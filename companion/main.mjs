// Atlas Companion: finds the DOFUS windows through the OS window list, reads the character from each window title,
// captures the game window on demand, by hotkey or at an interval (off by default), and reads the list the player
// shows (finished quests, obtained achievements) into completion events.
// Read-only: it never touches the game's process, memory, network or input. Captures stay in memory.
import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseDofusTitle } from '../src/game-window.ts';
import { closeOcr, completions, LISTS, loadCatalogs, readLines } from './read.mjs';

// test runs (--self-test…) may run next to the real companion; only the real one takes the single-instance lock
const TEST_RUN = process.argv.some((a) => a.startsWith('--self-test'));
if (!TEST_RUN && !app.requestSingleInstanceLock()) app.quit();

if (TEST_RUN) app.setPath('userData', join(app.getPath('temp'), 'atlas-companion-test')); // never the player's log
const DIR = app.getPath('userData');
const SETTINGS = join(DIR, 'settings.json');
const LOG = join(DIR, 'events.jsonl');
const MODES = ['observation', 'assisted', 'automatic'];
const HOTKEY_CAPTURE = 'CommandOrControl+Shift+F9';
const HOTKEY_STOP = 'CommandOrControl+Shift+F12';
const KEEP_DAYS = 30;

const settings = { mode: 'assisted', intervalSec: 0, list: 'none', region: null, atlasUrl: 'http://127.0.0.1:3101', ...readJson(SETTINGS) };
if (!MODES.includes(settings.mode)) settings.mode = 'assisted';
if (!(settings.list in LISTS)) settings.list = 'none';
if (!validRegion(settings.region)) settings.region = null;
if (!validUrl(settings.atlasUrl)) settings.atlasUrl = 'http://127.0.0.1:3101';
settings.intervalSec = clampInterval(settings.intervalSec);

const state = {
  stopped: false,
  windows: [],          // [{ sourceId, title, version, character }]
  activeId: null,       // sourceId of the window treated as active
  lastCapture: null,    // { at, width, height, darkShare, preview, error? }
  catalog: { loading: true },
  reading: false,
  lastRead: null,       // { at, list, lines, found, certain, fresh, signSeen, error?, text? }
  events: [],           // newest first, the last 50
};
const sent = new Set();  // `${character}|${type}|${object}` already in the log: never logged twice
let ui = null, tray = null, watchTimer = null, intervalTimer = null, catalogs = null, lastPrint = null;

function readJson(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; } }
function clampInterval(v) { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 5 && n <= 3600 ? n : 0; }
function validRegion(r) {
  return !!r && ['x', 'y', 'w', 'h'].every((k) => typeof r[k] === 'number' && r[k] >= 0 && r[k] <= 1)
    && r.w >= 0.03 && r.h >= 0.03 && r.x + r.w <= 1.0001 && r.y + r.h <= 1.0001;
}
function validUrl(u) { try { return ['http:', 'https:'].includes(new URL(u).protocol); } catch { return false; } }
function saveSettings() { writeFileSync(SETTINGS, JSON.stringify(settings, null, 2)); }

/** Time-sortable unique id (timestamp + random), for idempotent writes on the site. */
const eventId = () => Date.now().toString(36).padStart(10, '0') + randomBytes(8).toString('hex');
const dedupKey = (e) => `${e.characterKey}|${e.type}|${e.objectId}`;

function record(type, data) {
  const e = { eventId: eventId(), at: new Date().toISOString(), type, ...data, status: 'new' };
  appendFileSync(LOG, JSON.stringify(e) + '\n');
  if (e.objectId) sent.add(dedupKey(e));
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
  const all = keep.map((l) => JSON.parse(l));
  for (const e of all) if (e.objectId) sent.add(dedupKey(e));
  state.events = all.slice(-50).reverse();
}

async function refreshCatalog() {
  state.catalog = { loading: true }; push();
  const c = await loadCatalogs(settings.atlasUrl, DIR);
  catalogs = c.error ? null : c;
  state.catalog = c.error ? { error: c.error } : { version: c.version, source: c.source, counts: c.counts };
  push();
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
      lastPrint = null;
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

/** One frame of the active DOFUS window, kept in memory only; read when the player said which list it shows. */
async function capture(trigger) {
  if (state.stopped) return state.lastCapture;
  const w = state.windows.find((x) => x.sourceId === state.activeId);
  if (!w) { state.lastCapture = { at: new Date().toISOString(), trigger, error: 'Aucune fenêtre DOFUS trouvée.' }; push(); return state.lastCapture; }
  const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 3840, height: 2160 }, fetchWindowIcons: false });
  const img = sources.find((s) => s.id === w.sourceId)?.thumbnail;
  const at = new Date().toISOString();
  if (!img || img.isEmpty()) {
    state.lastCapture = { at, trigger, error: 'Windows n’a renvoyé aucune image : la fenêtre est peut-être réduite.' };
    push(); return state.lastCapture;
  }
  const { width, height } = img.getSize();
  const darkShare = darkPixels(img);
  state.lastCapture = {
    at, trigger, width, height, darkShare,
    // a black frame means Windows could not see the window (minimised, or covered on some setups): never read it
    error: darkShare > 0.98 ? 'Image presque noire : la fenêtre est réduite ou masquée, rien n’est lu.' : undefined,
    preview: img.resize({ width: 480 }).toDataURL(),
  };
  push();
  if (!state.lastCapture.error && settings.list in LISTS) {
    // at an interval, the list is read again only when the framed part changed (the player scrolled or switched)
    const print = framePrint(img, settings.region);
    if (trigger !== 'interval' || changed(lastPrint, print)) { lastPrint = print; await readCapture(img, w); }
  }
  return state.lastCapture;
}

async function readCapture(img, w) {
  const at = new Date().toISOString(), list = settings.list;
  if (state.reading) return;
  if (!w.character) { state.lastRead = { at, list, error: 'Aucun personnage en jeu : rien n’est attribué.' }; push(); return; }
  if (!catalogs) { state.lastRead = { at, list, error: state.catalog.error ?? 'Noms du jeu pas encore chargés.' }; push(); return; }
  state.reading = true; push();
  try {
    const lines = await readLines(img, settings.region, DIR);
    const { readings, signSeen } = completions(lines, catalogs, list);
    let fresh = 0;
    for (const r of readings) {
      const e = { characterKey: w.character.name, type: r.type, objectId: r.objectId };
      if (sent.has(dedupKey(e))) continue;
      fresh++;
      record(r.type, {
        ...e, name: r.name, className: w.character.className, previous: 'unknown', next: 'done',
        certain: r.certain, confidence: r.confidence, gameVersion: w.version,
        evidence: { source: 'ocr', screen: list, text: r.text, signSeen, dataVersion: catalogs.version },
      });
    }
    state.lastRead = {
      at, list, lines: lines.length, found: readings.length, certain: readings.filter((r) => r.certain).length, fresh, signSeen,
      versionMismatch: catalogs.version !== w.version ? `données du site ${catalogs.version}, jeu ${w.version}` : undefined,
      text: lines.map((l) => l.text).join('\n').slice(0, 4000),
    };
  } catch (e) {
    state.lastRead = { at, list, error: `Lecture impossible : ${e.message}` };
  } finally {
    state.reading = false; push();
  }
}

function darkPixels(img) {
  const px = img.resize({ width: 160 }).toBitmap(); // BGRA
  let dark = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] < 30) dark++;
  return dark / (px.length / 4);
}

/** 200 px wide grey thumbnail of the framed part (same detector as the browser share, `components/scan/ocr.ts`). */
function framePrint(img, region) {
  const { width: W, height: H } = img.getSize();
  const part = region ? img.crop({ x: Math.floor(region.x * W), y: Math.floor(region.y * H), width: Math.max(8, Math.round(region.w * W)), height: Math.max(8, Math.round(region.h * H)) }) : img;
  const px = part.resize({ width: 200 }).toBitmap();
  const grey = new Uint8Array(px.length / 4);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) grey[j] = (px[i + 2] * 299 + px[i + 1] * 587 + px[i] * 114) / 1000;
  return grey;
}
/** at least 0.4 % of the thumbnail pixels changed by more than 24 grey levels */
function changed(a, b) {
  if (!a || a.length !== b.length) return true;
  let n = 0;
  for (let j = 0; j < a.length; j++) if (Math.abs(a[j] - b[j]) > 24) n++;
  return n > a.length * 0.004;
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
  return { ...state, settings, lists: Object.fromEntries(Object.entries(LISTS).map(([k, v]) => [k, v.label])), hotkeys: { capture: HOTKEY_CAPTURE, stop: HOTKEY_STOP }, logPath: LOG };
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
    width: 580, height: 860, title: 'Atlas Companion', autoHideMenuBar: true,
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
  if (!patch || typeof patch !== 'object') return snapshot();
  if (MODES.includes(patch.mode)) settings.mode = patch.mode;
  if ('intervalSec' in patch) settings.intervalSec = clampInterval(patch.intervalSec);
  if (patch.list === 'none' || patch.list in LISTS) { settings.list = patch.list; lastPrint = null; }
  if ('region' in patch && (patch.region === null || validRegion(patch.region))) { settings.region = patch.region; lastPrint = null; }
  if (typeof patch.activeId === 'string' && state.windows.some((w) => w.sourceId === patch.activeId)) state.activeId = patch.activeId;
  if (typeof patch.atlasUrl === 'string' && validUrl(patch.atlasUrl) && patch.atlasUrl !== settings.atlasUrl) { settings.atlasUrl = patch.atlasUrl; refreshCatalog(); }
  saveSettings(); scheduleInterval(); push();
  return snapshot();
});
ipcMain.handle('reloadCatalog', () => refreshCatalog());

app.on('second-instance', showUi);
app.on('window-all-closed', () => { /* keep running in the tray */ });
app.on('will-quit', () => { globalShortcut.unregisterAll(); closeOcr(); });

const SELF_TEST = process.argv.includes('--self-test');
const READ_TEST = process.argv.indexOf('--self-test-read');
app.whenReady().then(() => {
  if (SELF_TEST) return selfTest();
  if (READ_TEST > 0) return readTest(process.argv[READ_TEST + 1], process.argv[READ_TEST + 2]);
  if (process.argv.includes('--self-test-ui')) return uiTest();
  pruneLog();
  tray = new Tray(nativeImage.createFromPath(join(import.meta.dirname, '../public/favicon-32x32.png')));
  tray.on('click', showUi);
  globalShortcut.register(HOTKEY_CAPTURE, () => capture('hotkey'));
  globalShortcut.register(HOTKEY_STOP, () => setStopped(!state.stopped));
  watchTimer = setInterval(watch, 2000);
  watch(); scheduleInterval(); updateTray(); showUi(); refreshCatalog();
});

// `electron . --self-test` prints what it sees (classes and versions, no character names), captures once in memory and
// quits: no window, no hotkey, nothing written except the event log
async function selfTest() {
  await watch();
  const live = process.argv[process.argv.indexOf('--self-test') + 1];
  if (live in LISTS) { settings.list = live; await refreshCatalog(); }
  const t0 = Date.now();
  const c = await capture('self-test');
  console.log(JSON.stringify({
    windows: state.windows.map((w) => ({ version: w.version, className: w.character?.className ?? null, breedId: w.character?.breedId ?? null, hasCharacter: !!w.character })),
    capture: c && { width: c.width, height: c.height, darkShare: c.darkShare && Math.round(c.darkShare * 1000) / 1000, error: c.error ?? null },
    events: state.events.map((e) => e.type),
    read: state.lastRead && { ms: Date.now() - t0, lines: state.lastRead.lines, found: state.lastRead.found, certain: state.lastRead.certain, signSeen: state.lastRead.signSeen, error: state.lastRead.error },
  }));
  await closeOcr();
  app.exit(0);
}

// `electron . --self-test-read <image> <quests-done|achievements-done>`: reads an image file through the same pipeline
// and prints what would become events. Writes nothing.
async function readTest(file, list) {
  try {
    const c = await loadCatalogs(settings.atlasUrl, DIR);
    if (c.error) throw new Error(c.error);
    const lines = await readLines(nativeImage.createFromPath(file), null, DIR);
    const { readings, signSeen } = completions(lines, c, list);
    console.log(JSON.stringify({ lines: lines.length, signSeen, text: process.argv.includes("--text") ? lines.map((l) => `${Math.round(l.confidence)} ${l.text}`) : undefined, readings: readings.map((r) => ({ id: r.objectId, certain: r.certain, confidence: r.confidence })) }));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
  }
  await closeOcr();
  app.exit(0);
}

// `electron . --self-test-ui`: opens the companion window hidden with a sample state (fictional names) and prints
// renderer errors and the text shown, so the window is checked without a person looking at it
async function uiTest() {
  const errors = [];
  const win = new BrowserWindow({ show: false, width: 580, height: 860, webPreferences: { preload: join(import.meta.dirname, 'preload.cjs'), contextIsolation: true, sandbox: true } });
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(join(import.meta.dirname, 'ui.html'));
  const now = new Date().toISOString();
  Object.assign(state, {
    windows: [{ sourceId: 'w1', title: 'Testperso - Iop - 3.7.14.18 - Release', version: '3.7.14.18', channel: 'Release', character: { name: 'Testperso', className: 'Iop', breedId: 8 } }],
    activeId: 'w1', catalog: { version: '3.7.14.18', source: 'site', counts: { quest: 1984, achievement: 2777 } },
    lastCapture: { at: now, trigger: 'button', width: 1920, height: 1080, darkShare: 0, preview: nativeImage.createFromPath(join(import.meta.dirname, '../public/og-image.png')).resize({ width: 480 }).toDataURL() },
    lastRead: { at: now, list: 'quests-done', lines: 9, found: 2, certain: 1, fresh: 2, signSeen: true, text: ['Terminées', 'Offrande à Danizzal'].join(String.fromCharCode(10)) },
    events: [
      { at: now, type: 'quest.completed', objectId: 'quest:1093', name: 'Offrande à Danizzal', characterKey: 'Testperso', certain: true },
      { at: now, type: 'quest.completed', objectId: 'quest:1556', name: 'La chapelle noire', characterKey: 'Testperso', certain: false },
      { at: now, type: 'character.seen', characterKey: 'Testperso', className: 'Iop' },
    ],
  });
  Object.assign(settings, { list: 'quests-done', region: { x: 0.2, y: 0.1, w: 0.5, h: 0.7 } });
  win.webContents.send('state', snapshot());
  await new Promise((r) => setTimeout(r, 500));
  const text = await win.webContents.executeJavaScript('document.body.innerText');
  const boxShown = await win.webContents.executeJavaScript("!document.getElementById('box').hidden");
  console.log(JSON.stringify({ errors, boxShown, text }));
  app.exit(0);
}
