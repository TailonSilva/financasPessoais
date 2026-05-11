const { app, BrowserWindow, Menu } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

let apiServer
let mainWindow

function getAppIconPath() {
  return path.join(__dirname, '..', 'build', 'icon.ico')
}

function ensureRuntimePaths() {
  const projectDatabasePath = path.join(__dirname, '..', 'src', 'backend', 'db.sqlite')
  const projectUploadsPath = path.join(__dirname, '..', 'src', 'backend', 'uploads')

  if (!app.isPackaged) {
    process.env.DB_PATH = projectDatabasePath
    process.env.UPLOADS_PATH = projectUploadsPath
    return
  }

  const userDataPath = app.getPath('userData')
  const productionDatabaseDirectory = path.join(userDataPath, 'database')
  const productionDatabasePath = path.join(productionDatabaseDirectory, 'financas-pessoais-cliente.sqlite')
  const productionUploadsPath = path.join(userDataPath, 'uploads')

  fs.mkdirSync(productionDatabaseDirectory, { recursive: true })
  fs.mkdirSync(productionUploadsPath, { recursive: true })

  if (!fs.existsSync(productionDatabasePath)) {
    const bundledDatabasePath = path.join(process.resourcesPath, 'db.sqlite')

    if (fs.existsSync(bundledDatabasePath)) {
      fs.copyFileSync(bundledDatabasePath, productionDatabasePath)
    }
  }

  process.env.DB_PATH = productionDatabasePath
  process.env.UPLOADS_PATH = productionUploadsPath
}

async function startApiServer() {
  ensureRuntimePaths()

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

  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    height: 760,
    icon: getAppIconPath(),
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

  mainWindow.on('closed', () => {
    mainWindow = null
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
