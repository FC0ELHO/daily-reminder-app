// src/main/index.js
const { app, BrowserWindow, screen } = require('electron'); // AÑADIDO 'screen'
const path = require('path');
const { initDb } = require('./database');
const { createTray, destroyTray, setMainWindowAndStickyCreator } = require('./tray');
const { startReminderCheck, stopReminderCheck, setMainWindow } = require('./notifications');
const { setupIpcHandlers, setMainWindowForHandlers, createStickyWindow } = require('./ipcHandlers');
const { WINDOW_DEFAULTS } = require('./config');

let mainWindow;

function createMainWindow() {
  console.log('createMainWindow called');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize; // 'workAreaSize' excluye la barra de tareas/dock

  const win = new BrowserWindow({
    // Usa las dimensiones de la pantalla completa
    width: width,
    height: height,
    minWidth: WINDOW_DEFAULTS.minWidth, // Mantén los minWidth/minHeight de config.js
    minHeight: WINDOW_DEFAULTS.minHeight,
    frame: WINDOW_DEFAULTS.frame,
    backgroundColor: WINDOW_DEFAULTS.backgroundColor,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false // Oculta la ventana hasta que esté lista para mostrar
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  win.on('ready-to-show', () => {
    win.show();
    // Efecto de atenuación suave (opcional, pero estético)
    win.setOpacity(0.98);
    setTimeout(() => win.setOpacity(1), 50);
  });

  mainWindow = win;
  setMainWindow(mainWindow);
  setMainWindowForHandlers(mainWindow);
  setMainWindowAndStickyCreator(mainWindow, createStickyWindow);
}

app.whenReady().then(async () => {
  try {
    await initDb();
  } catch (e) {
  }

  createMainWindow();
  createTray();
  setupIpcHandlers();
  startReminderCheck();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  stopReminderCheck();
  destroyTray();
});