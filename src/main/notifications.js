// src/main/notifications.js
const { Notification } = require('electron');
const path = require('path');
const { ICON_PATH, NOTIFICATION_OVERLAY_PATH } = require('./config');
const { getAllTasks } = require('./database');
const fs = require('fs');

let notificationShown = new Set(); // Para no repetir notificaciones por tarea
let reminderInterval;
let mainWindowRef; // Referencia a la ventana principal

function setMainWindow(win) {
  mainWindowRef = win;
}

function showNotification(title, body) {
  new Notification({
    title: title,
    body: body,
    icon: ICON_PATH,
  }).show();
}

async function checkReminders() {
  const tasks = await getAllTasks();
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  let hasUrgentTasks = false;

  tasks.forEach(task => {
    if (!task.completed) {
      const taskDateTime = new Date(`${task.date}T${task.time}`);

      if (taskDateTime <= fiveMinutesFromNow && taskDateTime > now) {
        hasUrgentTasks = true;
        if (!notificationShown.has(task.id)) {
          showNotification(`Recordatorio: ${task.title}`, `Faltan ${Math.ceil((taskDateTime - now) / (60 * 1000))} minutos. ${task.description}`);
          notificationShown.add(task.id);
        }
      } else if (taskDateTime <= now && !notificationShown.has(task.id)) {
        showNotification(`¡Tarea Vencida!: ${task.title}`, `La tarea "${task.description}" ha vencido.`);
        notificationShown.add(task.id);
        hasUrgentTasks = true;
      }
    }
  });

  if (process.platform === 'win32' && mainWindowRef && !mainWindowRef.isDestroyed()) {
    if (hasUrgentTasks && fs.existsSync(NOTIFICATION_OVERLAY_PATH)) {
      mainWindowRef.setOverlayIcon(NOTIFICATION_OVERLAY_PATH, 'Hay tareas pendientes');
    } else {
      mainWindowRef.setOverlayIcon(null, '');
    }
  }

  // Notificar al renderer principal que las tareas pueden haberse actualizado
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('tasks-updated');
  }
}

function startReminderCheck() {
  checkReminders();
  reminderInterval = setInterval(checkReminders, 60 * 1000); // Cada minuto
}

function stopReminderCheck() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
  }
}

function removeNotificationForTask(taskId) {
  notificationShown.delete(taskId);
}

module.exports = {
  setMainWindow,
  startReminderCheck,
  stopReminderCheck,
  removeNotificationForTask,
  checkReminders // Para usarlo después de actualizar/eliminar tareas
};