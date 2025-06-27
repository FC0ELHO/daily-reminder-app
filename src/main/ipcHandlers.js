const { ipcMain, BrowserWindow, screen } = require('electron');
const path = require('path');
const { getCategorizedTasks, addTask, updateTask, deleteTask } = require('./database');
const { removeNotificationForTask, checkReminders } = require('./notifications');
const { STICKY_WINDOW_DEFAULTS, WINDOW_DEFAULTS } = require('./config');

let mainWindowRef;

function setMainWindowForHandlers(win) {
  mainWindowRef = win;
}

function createStickyWindow(taskId = null) {
  const stickyWindow = new BrowserWindow({
    ...STICKY_WINDOW_DEFAULTS,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false
  });

  stickyWindow.loadFile(path.join(__dirname, '../renderer/task-form.html'));

  stickyWindow.once('ready-to-show', () => {
    if (taskId) {
      stickyWindow.webContents.send('load-task-for-edit', taskId);
    }
    stickyWindow.show();
  });
}


function setupIpcHandlers() {
  ipcMain.on('close-window', () => {
    if (mainWindowRef) mainWindowRef.close();
  });
  ipcMain.on('minimize-window', () => {
    if (mainWindowRef) mainWindowRef.minimize();
  });
  ipcMain.on('maximize-window', () => {
    if (mainWindowRef) {
      if (mainWindowRef.isMaximized()) {
        mainWindowRef.unmaximize();
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

        const defaultWidth = WINDOW_DEFAULTS.width;
        const defaultHeight = WINDOW_DEFAULTS.height;

        const x = Math.round(screenWidth / 2 - defaultWidth / 2);
        const y = Math.round(screenHeight / 2 - defaultHeight / 2);

        mainWindowRef.setBounds({
          x: x,
          y: y,
          width: defaultWidth,
          height: defaultHeight
        }, true);
      } else {
        mainWindowRef.maximize();
      }
    }
  });

  ipcMain.on('move-window', (event, { x, y, isMoving }) => {
    if (isMoving && mainWindowRef && !mainWindowRef.isDestroyed()) {
      const [currentX, currentY] = mainWindowRef.getPosition();
      mainWindowRef.setPosition(currentX + x, currentY + y);
    }
  });

  ipcMain.handle('get-tasks', async () => {
    try {
      const tasks = await getCategorizedTasks();
      return { success: true, data: tasks };
    } catch (error) {
      console.error('Error al obtener tareas:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('add-task', async (_, taskData) => {
    try {
      const newTask = await addTask(taskData);
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('tasks-updated');
      }
      checkReminders(); // Actualizar recordatorios
      return { success: true, data: newTask };
    } catch (error) {
      console.error('Error al añadir tarea:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('update-task', async (_, taskId, updatedData) => {
    try {
      const updatedTask = await updateTask(taskId, updatedData);
      if (updatedTask) {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('tasks-updated');
        }
        checkReminders(); // Actualizar recordatorios
        return { success: true, data: updatedTask };
      }
      return { success: false, message: 'Tarea no encontrada' };
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('delete-task', async (_, taskId) => {
    try {
      const deleted = await deleteTask(taskId);
      if (deleted) {
        removeNotificationForTask(taskId); // Limpiar notificación
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('tasks-updated');
        }
        checkReminders(); // Recalcular overlays y recordatorios
        return { success: true };
      }
      return { success: false, message: 'Tarea no encontrada' };
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.on('create-sticky-window', (event, taskId = null) => {
    createStickyWindow(taskId);
  });
}

module.exports = {
  setupIpcHandlers,
  setMainWindowForHandlers,
  createStickyWindow
};