const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('__APP_CONFIG__', {
  apiBaseUrl: process.env.API_BASE_URL || '',
})
