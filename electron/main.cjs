const { app, BrowserWindow, Menu } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

let apiServer

function ensureDatabasePath() {
  const userDatabasePath = path.join(app.getPath('userData'), 'db.sqlite')

  if (!fs.existsSync(userDatabasePath)) {
    const bundledDatabasePath = app.isPackaged
      ? path.join(process.resourcesPath, 'db.sqlite')
      : path.join(__dirname, '..', 'src', 'backend', 'db.sqlite')

    if (fs.existsSync(bundledDatabasePath)) {
      fs.copyFileSync(bundledDatabasePath, userDatabasePath)
    }
  }

  process.env.DB_PATH = userDatabasePath
}

async function startApiServer() {
  ensureDatabasePath()

  const appPath = path.join(__dirname, '..', 'src', 'backend', 'app.js')
  const backend = await import(pathToFileURL(appPath).href)

  return new Promise((resolve, reject) => {
    apiServer = backend.app.listen(0, '127.0.0.1', () => {
      resolve(apiServer.address().port)
    })

    apiServer.on('error', reject)
  })
}

async function createWindow() {
  const apiPort = await startApiServer()
  process.env.API_BASE_URL = `http://127.0.0.1:${apiPort}`

  Menu.setApplicationMenu(null)

  const mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    height: 760,
    minHeight: 640,
    minWidth: 1100,
    show: false,
    title: 'Finanças Pessoais',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    width: 1280,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (process.env.ELECTRON_START_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_START_URL)
    return
  }

  await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (apiServer) {
    apiServer.close()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
