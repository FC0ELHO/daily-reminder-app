// src/main/database.js
const fs = require('fs');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { DB_DIRECTORY, DB_FILE_PATH } = require('./config');
const { v4: uuidv4 } = require('uuid'); // Para generar IDs únicos

let db;

async function initDb() {
  if (!fs.existsSync(DB_DIRECTORY)) {
    fs.mkdirSync(DB_DIRECTORY, { recursive: true });
  }
  const adapter = new JSONFile(DB_FILE_PATH);
  db = new Low(adapter, { tasks: [] });
  await db.read();
  db.data = db.data || { tasks: [] };
  await db.write();
  return db;
}

function getDbInstance() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

async function getAllTasks() {
  await db.read();
  return db.data.tasks;
}

async function getCategorizedTasks() {
  await db.read();
  const tasks = db.data.tasks;
  const now = new Date();

  // Normalizar la fecha actual (sin horas/minutos/segundos)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime() && !task.completed;
  }).sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time}`).getTime();
    const timeB = new Date(`${b.date}T${b.time}`).getTime();
    return timeA - timeB;
  });

  const upcomingTasks = tasks.filter(task => {
    const taskDateTime = new Date(`${task.date}T${task.time}`);
    return !task.completed && taskDateTime > now;
  }).sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time}`).getTime();
    const dateTimeB = new Date(`${b.date}T${b.time}`).getTime();
    return dateTimeA - dateTimeB;
  });

  const overdueTasks = tasks.filter(task => {
    const taskDateTime = new Date(`${task.date}T${task.time}`);
    return !task.completed && taskDateTime <= now;
  }).sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time}`).getTime();
    const dateTimeB = new Date(`${b.date}T${b.time}`).getTime();
    return dateTimeA - dateTimeB;
  });

  return { today: todayTasks, upcoming: upcomingTasks, overdue: overdueTasks };
}

async function addTask(task) {
  await db.read();
  const newTask = { id: uuidv4(), completed: false, ...task };
  db.data.tasks.push(newTask);
  await db.write();
  return newTask;
}

async function updateTask(taskId, updates) {
  await db.read();
  const index = db.data.tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    db.data.tasks[index] = { ...db.data.tasks[index], ...updates };
    await db.write();
    return db.data.tasks[index];
  }
  return null;
}

async function deleteTask(taskId) {
  await db.read();
  const initialLength = db.data.tasks.length;
  db.data.tasks = db.data.tasks.filter(t => t.id !== taskId);
  await db.write();
  return db.data.tasks.length < initialLength;
}

module.exports = {
  initDb,
  getDbInstance,
  getAllTasks,
  getCategorizedTasks,
  addTask,
  updateTask,
  deleteTask,
};