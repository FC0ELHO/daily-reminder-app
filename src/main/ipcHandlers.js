// src/main/ipcHandlers.js
const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const { getCategorizedTasks, addTask, updateTask, deleteTask } = require('./database');
const { removeNotificationForTask, checkReminders } = require('./notifications');
const { STICKY_WINDOW_DEFAULTS } = require('./config');

let mainWindowRef; // Referencia a la ventana principal

function setMainWindowForHandlers(win) {
  mainWindowRef = win;
}

// NUEVA FUNCIÓN: Encapsula la lógica para crear la ventana de formulario de tarea
function createStickyWindow(taskId = null) {
  const stickyWindow = new BrowserWindow({
    ...STICKY_WINDOW_DEFAULTS,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false // Oculta hasta que esté lista para mostrar
  });

  stickyWindow.loadFile(path.join(__dirname, '../renderer/task-form.html'));

  stickyWindow.once('ready-to-show', () => {
    if (taskId) {
      // Envía el ID de la tarea a la ventana del formulario si es para edición
      stickyWindow.webContents.send('load-task-for-edit', taskId);
    }
    stickyWindow.show();
  });

  // Opcional: Para gestionar múltiples ventanas sticky si fuera necesario
  // stickyWindows.add(stickyWindow);
  // stickyWindow.on('closed', () => stickyWindows.delete(stickyWindow));
}


function setupIpcHandlers() {
  // Manejadores para el control de ventana principal
  // CAMBIO: Nombres de canales IPC para que coincidan con los del renderer (después de ajustar preload.js)
  ipcMain.on('close-window', () => { // Era 'close-app'
    if (mainWindowRef) mainWindowRef.close();
  });
  ipcMain.on('minimize-window', () => { // Era 'minimize-app'
    if (mainWindowRef) mainWindowRef.minimize();
  });
  ipcMain.on('maximize-window', () => { // Era 'maximize-app'
    if (mainWindowRef) {
      if (mainWindowRef.isMaximized()) {
        mainWindowRef.unmaximize();
      } else {
        mainWindowRef.maximize();
      }
    }
  });

  // Mover ventana (lógica de arrastre desde el renderer)
  ipcMain.on('move-window', (event, { x, y, isMoving }) => {
    if (isMoving && mainWindowRef && !mainWindowRef.isDestroyed()) {
      const [currentX, currentY] = mainWindowRef.getPosition();
      mainWindowRef.setPosition(currentX + x, currentY + y);
    }
  });

  // API para obtener tareas (invocado desde renderer)
  ipcMain.handle('get-tasks', async () => {
    try {
      const tasks = await getCategorizedTasks();
      return { success: true, data: tasks };
    } catch (error) {
      console.error('Error al obtener tareas:', error);
      return { success: false, message: error.message };
    }
  });

  // API para añadir tarea (invocado desde renderer)
  ipcMain.handle('add-task', async (_, taskData) => {
    try {
      const newTask = await addTask(taskData);
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('tasks-updated'); // Notificar al renderer principal
      }
      checkReminders(); // Actualizar recordatorios
      return { success: true, data: newTask };
    } catch (error) {
      console.error('Error al añadir tarea:', error);
      return { success: false, message: error.message };
    }
  });

  // API para actualizar tarea (invocado desde renderer)
  ipcMain.handle('update-task', async (_, taskId, updatedData) => {
    try {
      const updatedTask = await updateTask(taskId, updatedData);
      if (updatedTask) {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('tasks-updated'); // Notificar al renderer principal
        }
        checkReminders(); // Actualizar recordatorios
        return { success: true, data: updatedTask };
      }
      return { success: false, message: 'Task not found' };
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
      return { success: false, message: error.message };
    }
  });

  // API para eliminar tarea (invocado desde renderer)
  ipcMain.handle('delete-task', async (_, taskId) => {
    try {
      const deleted = await deleteTask(taskId);
      if (deleted) {
        removeNotificationForTask(taskId); // Limpiar notificación
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('tasks-updated'); // Notificar al renderer principal
        }
        checkReminders(); // Recalcular overlays y recordatorios
        return { success: true };
      }
      return { success: false, message: 'Task not found' };
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      return { success: false, message: error.message };
    }
  });

  // IPC Handler para que el renderer pueda crear una ventana de tarea.
  // Ahora, simplemente llamamos a la función 'createStickyWindow' que hemos definido arriba.
  ipcMain.on('create-sticky-window', (event, taskId = null) => {
    createStickyWindow(taskId); // Reutiliza la función centralizada
  });
}

// EXPORTAR la función createStickyWindow para que otros módulos (como index.js y tray.js) puedan usarla.
module.exports = {
  setupIpcHandlers,
  setMainWindowForHandlers,
  createStickyWindow // ¡IMPORTANTE: EXPORTAR ESTA FUNCIÓN!
};