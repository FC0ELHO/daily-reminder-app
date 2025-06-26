// src/main/tray.js
const { Tray, Menu } = require('electron');
const path = require('path');
const { ICON_PATH, APP_TITLE } = require('./config');
const fs = require('fs');

let tray;
let mainWindowRef; // Referencia a la ventana principal
let createStickyWindowFn; // Función para crear ventana sticky

function setMainWindowAndStickyCreator(win, stickyCreator) {
  mainWindowRef = win;
  createStickyWindowFn = stickyCreator;
}

function createTray() {
  if (!fs.existsSync(ICON_PATH)) {
    console.error(`Error: Icono no encontrado en ${ICON_PATH}`);
    return;
  }

  tray = new Tray(ICON_PATH);
  tray.setToolTip(APP_TITLE);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir',
      click: () => {
        if (mainWindowRef) {
          if (mainWindowRef.isMinimized()) mainWindowRef.restore();
          mainWindowRef.show();
        } else {
          // Esto no debería ocurrir si mainWindowRef se setea correctamente
          // Pero como fallback se podría intentar recrear la ventana principal aquí
        }
      }
    },
    {
      label: 'Añadir Tarea',
      click: () => {
        if (createStickyWindowFn) {
          createStickyWindowFn();
        } else {
          console.warn('createStickyWindow function not set for tray.');
        }
      }
    },
    { type: 'separator' },
    { label: 'Salir', click: () => require('electron').app.quit() }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindowRef) {
      if (mainWindowRef.isVisible()) {
        mainWindowRef.hide();
      } else {
        mainWindowRef.show();
        if (mainWindowRef.isMinimized()) mainWindowRef.restore();
      }
    } else {
      // Fallback: si por alguna razón la main window no existe, la crea.
      // En una app bien estructurada, la ventana principal siempre debería existir.
    }
  });
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = {
  createTray,
  destroyTray,
  setMainWindowAndStickyCreator,
};