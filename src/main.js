const { app, BrowserWindow, components, shell, nativeTheme, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const HOME_URL = 'https://mubi.com/';

// Hosts allowed inside the app window. Everything else opens in the default browser.
// The sign-in providers are here so "Continue with Google/Apple/Facebook" works.
const INTERNAL_HOSTS = [
  'mubi.com',
  'accounts.google.com',
  'appleid.apple.com',
  'facebook.com',
];

function isInternal(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:') return false;
    return INTERNAL_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

// Look like plain Chrome, so the site doesn't treat us as an unknown browser.
app.userAgentFallback = app.userAgentFallback
  .replace(/ Electron\/\S+/, '')
  .replace(new RegExp(` ${app.getName()}\\/\\S+`), '');

app.setAppUserModelId('com.danial.mubiview');
nativeTheme.themeSource = 'dark';
Menu.setApplicationMenu(null);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  start();
}

// ---- window size/position memory -------------------------------------------

const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return { width: 1280, height: 800 };
  }
}

function saveState(win) {
  const state = { ...win.getNormalBounds(), maximized: win.isMaximized() };
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(state));
  } catch {}
}

// ---- optional user CSS: %APPDATA%/Mubi/custom.css ------------------------

function userCss() {
  try {
    return fs.readFileSync(path.join(app.getPath('userData'), 'custom.css'), 'utf8');
  } catch {
    return '';
  }
}

// ---- keyboard shortcuts (there is no menu bar) ------------------------------

function handleKeys(win, input) {
  if (input.type !== 'keyDown') return false;
  const wc = win.webContents;
  const ctrl = input.control || input.meta;
  const key = input.key;

  if (key === 'F11') win.setFullScreen(!win.isFullScreen());
  else if (key === 'Escape' && win.isFullScreen()) win.setFullScreen(false);
  else if (key === 'F5' || (ctrl && key.toLowerCase() === 'r')) wc.reload();
  else if (input.alt && key === 'ArrowLeft') wc.navigationHistory.goBack();
  else if (input.alt && key === 'ArrowRight') wc.navigationHistory.goForward();
  else if (input.alt && key === 'Home') wc.loadURL(HOME_URL);
  else if (ctrl && (key === '=' || key === '+')) wc.setZoomLevel(wc.getZoomLevel() + 0.5);
  else if (ctrl && key === '-') wc.setZoomLevel(wc.getZoomLevel() - 0.5);
  else if (ctrl && key === '0') wc.setZoomLevel(0);
  else if (ctrl && input.shift && key.toLowerCase() === 'i') wc.toggleDevTools();
  else return false;
  return true;
}

// ---- main window -------------------------------------------------------------

function createWindow() {
  const state = loadState();
  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 640,
    minHeight: 400,
    title: 'Mubi',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
    },
  });

  if (state.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.on('close', () => saveState(win));

  const wc = win.webContents;

  // Keep the window title as just "Mubi".
  win.on('page-title-updated', (e) => e.preventDefault());

  wc.on('before-input-event', (e, input) => {
    if (handleKeys(win, input)) e.preventDefault();
  });

  wc.on('did-finish-load', () => {
    const css = userCss();
    if (css) wc.insertCSS(css);
  });

  // External links go to the default browser; Mubi and sign-in pages stay here.
  wc.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: { autoHideMenuBar: true, backgroundColor: '#000000' },
      };
    }
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  wc.on('will-navigate', (e, url) => {
    if (!isInternal(url)) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(HOME_URL);
  return win;
}

async function start() {
  await app.whenReady();

  // Wait until the Widevine module is installed/updated before loading Mubi.
  await components.whenReady();
  console.log('components ready:', components.status());

  createWindow();

  app.on('window-all-closed', () => app.quit());
}
