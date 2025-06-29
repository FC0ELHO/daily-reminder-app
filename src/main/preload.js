const { contextBridge, ipcRenderer } = require('electron');

// 🛡️ Funciones de validación
const sanitizers = {
  reminder: (data) => {
    if (!data || typeof data !== 'object') return null;
    
    return {
      id: Number(data.id) || Date.now(),
      text: String(data.text || '').slice(0, 500), // Limita a 500 caracteres
      date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      isSticky: Boolean(data.isSticky)
    };
  },
  
  windowAction: (action) => ['minimize', 'close', 'sticky'].includes(action) ? action : null
};

// 🚀 API Segura para el Renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // 1. Sistema de Recordatorios (debe coincidir con tus handlers existentes)
  reminders: {
    add: async (reminder) => {
      const cleanData = sanitizers.reminder(reminder);
      return cleanData ? ipcRenderer.invoke('reminder:add', cleanData) : Promise.reject('Datos inválidos');
    },
    
    getAll: () => ipcRenderer.invoke('reminder:get-all'),
    
    delete: (id) => {
      const cleanId = Number(id);
      return !isNaN(cleanId) ? ipcRenderer.invoke('reminder:delete', cleanId) : Promise.reject('ID inválido');
    },
    
    update: async (reminder) => {
      const cleanData = sanitizers.reminder(reminder);
      return cleanData ? ipcRenderer.invoke('reminder:update', cleanData) : Promise.reject('Datos inválidos');
    }
  },

  // 2. Control de Ventana (ajustado a tu sticky window)
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    toggleSticky: (state) => {
      const cleanState = typeof state === 'boolean' ? state : false;
      ipcRenderer.send('window:toggle-sticky', cleanState);
    }
  },

  // 3. Sistema de Notificaciones (para tus recordatorios)
  notifications: {
    show: (title, options) => {
      const cleanOptions = {
        title: String(title || 'Recordatorio').slice(0, 100),
        body: String(options?.body || '').slice(0, 500),
        silent: Boolean(options?.silent)
      };
      ipcRenderer.send('notification:show', cleanOptions);
    }
  },

  // 4. Utilidades
  utils: {
    getAppVersion: () => ipcRenderer.invoke('app:version'),
    getPlatform: () => process.platform
  }
});

// 🛡️ Protección adicional
Object.freeze(window.electronAPI);