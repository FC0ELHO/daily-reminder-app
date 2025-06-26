// src/main/config.js
const path = require('path');
const { app } = require('electron');

const ASSETS_PATH = path.join(__dirname, '../../assets');
const USER_DATA_PATH = app.getPath('userData');
const DB_DIRECTORY = path.join(USER_DATA_PATH, 'database');
const DB_FILE_PATH = path.join(DB_DIRECTORY, 'tasks.json');
const ICON_PATH = path.join(ASSETS_PATH, 'icon.png');
const NOTIFICATION_OVERLAY_PATH = path.join(ASSETS_PATH, 'notification-overlay.png');

module.exports = {
  ASSETS_PATH,
  USER_DATA_PATH,
  DB_DIRECTORY,
  DB_FILE_PATH,
  ICON_PATH,
  NOTIFICATION_OVERLAY_PATH,
  APP_TITLE: 'Daily Reminder',
  WINDOW_DEFAULTS: {
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    backgroundColor: '#f5f7fa',
  },
  STICKY_WINDOW_DEFAULTS: {
    width: 400,
    height: 450,
    frame: false,
    resizable: true,
    transparent: false,
  },
};