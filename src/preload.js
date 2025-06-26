// src/preload.js
console.log('Preload script loaded successfully.'); // <-- Añade esta línea
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Control de ventana principal (CANALES CORREGIDOS)
  closeWindow: () => ipcRenderer.send('close-window'),    // CAMBIO: de 'close-app' a 'close-window'
  minimizeWindow: () => ipcRenderer.send('minimize-window'), // CAMBIO: de 'minimize-app' a 'minimize-window'
  maximizeWindow: () => ipcRenderer.send('maximize-window'), // CAMBIO: de 'maximize-app' a 'maximize-window'
  moveWindow: (data) => ipcRenderer.send('move-window', data),

  // Tareas (ahora con update y delete)
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  addTask: (task) => ipcRenderer.invoke('add-task', task),
  updateTask: (taskId, updates) => ipcRenderer.invoke('update-task', taskId, updates),
  deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),

  // API para crear nota adhesiva desde la ventana principal
  createStickyWindow: (taskId = null) => ipcRenderer.send('create-sticky-window', taskId),

  // Para que task-form-renderer.js reciba el ID de la tarea a editar
  onLoadTaskForEdit: (callback) => ipcRenderer.on('load-task-for-edit', (event, taskId) => callback(taskId)),

  // Listener para cuando las tareas se actualizan (ej. desde sticky notes)
  onTasksUpdated: (callback) => ipcRenderer.on('tasks-updated', () => callback()),

  // Utilidades
  platform: process.platform,
  // showContextMenu: () => ipcRenderer.send('show-context-menu') // Si tienes un showContextMenu lo puedes descomentar
});

