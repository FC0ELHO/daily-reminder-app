// src/main/index.js
console.log('Starting index.js'); // <-- Aquí
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDb } = require('./database');
const { createTray, destroyTray, setMainWindowAndStickyCreator } = require('./tray');
const { startReminderCheck, stopReminderCheck, setMainWindow } = require('./notifications');
// MODIFICACIÓN CLAVE: Importamos 'createStickyWindow' directamente de ipcHandlers
// Asegúrate de que ipcHandlers.js realmente EXPORTE esta función
const { setupIpcHandlers, setMainWindowForHandlers, createStickyWindow } = require('./ipcHandlers');
const { WINDOW_DEFAULTS } = require('./config');

let mainWindow;

function createMainWindow() {
  console.log('createMainWindow called'); // <-- Aquí
  const win = new BrowserWindow({
    ...WINDOW_DEFAULTS,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false // Oculta la ventana hasta que esté lista para mostrar
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));
   console.log('Loading index.html...'); // <-- Aquí

  win.on('ready-to-show', () => {
    console.log('Main window ready to show'); // <-- Aquí
    win.show();
    // Efecto de atenuación suave (opcional, pero estético)
    win.setOpacity(0.98);
    setTimeout(() => win.setOpacity(1), 50);
  });

  // Guardamos la referencia de la ventana principal para otros módulos
  mainWindow = win;
  setMainWindow(mainWindow); // Pasa la referencia a notifications.js
  setMainWindowForHandlers(mainWindow); // Pasa la referencia a ipcHandlers.js

  // MODIFICACIÓN CLAVE: Pasamos la función 'createStickyWindow' importada
  // directamente a 'setMainWindowAndStickyCreator' para que el módulo 'tray'
  // pueda usarla para abrir la ventana de tareas.
  setMainWindowAndStickyCreator(mainWindow, createStickyWindow);
  console.log('Main window and IPC handlers configured.'); // <-- Aquí
}


// Cuando Electron esté listo
app.whenReady().then(async () => {
  console.log('App is ready, initializing database...'); // <-- Aquí
  try {
    await initDb();
    console.log('Database initialized successfully.'); // <-- Aquí
  } catch (e) {
    console.error('Error initializing database:', e); // <-- MUY IMPORTANTE
  }

  createMainWindow();
  createTray();
  setupIpcHandlers();
  startReminderCheck();
  console.log('Main process setup complete.'); // <-- Aquí
});

// Evento: Todas las ventanas cerradas
app.on('window-all-closed', () => {
  // En macOS, las aplicaciones suelen permanecer activas en la barra de menú
  // incluso después de que todas las ventanas estén cerradas.
  // Aquí, salimos de la aplicación solo si no estamos en macOS.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Evento: La aplicación se activa (ej. clic en el icono del dock en macOS)
app.on('activate', () => {
  // En macOS, es común recrear una ventana en la aplicación cuando el icono del dock
  // se hace clic y no hay otras ventanas abiertas.
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Evento: Antes de que la aplicación termine (quit)
app.on('before-quit', () => {
  // Limpieza: Asegurarse de que el intervalo de recordatorios se detenga
  stopReminderCheck();
  // Limpieza: Destruir el icono de la bandeja del sistema
  destroyTray();
});