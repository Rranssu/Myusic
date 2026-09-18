const { app, BrowserWindow, Menu, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const { setupCustomProtocol } = require("./protocol.cjs");
const { registerIpcHandlers } = require("./ipcHandlers.cjs");
const { MetadataService } = require("./metadataService.cjs");

app.name = "myusic";
const isDev = !app.isPackaged;

// Register privileged custom streaming scheme with CORS enabled
protocol.registerSchemesAsPrivileged([
  {
    scheme: "atom",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true
    }
  }
]);

let mainWindow = null;

// Initialize file paths
const userDataPath = app.getPath("userData");
const artworkCacheDir = path.join(userDataPath, "artwork_cache");
const animatedCacheDir = path.join(userDataPath, "animated_cache");
const dbFilePath = path.join(userDataPath, "library.json");
const playlistsFilePath = path.join(userDataPath, "playlists.json");

if (!fs.existsSync(artworkCacheDir)) fs.mkdirSync(artworkCacheDir, { recursive: true });
if (!fs.existsSync(animatedCacheDir)) fs.mkdirSync(animatedCacheDir, { recursive: true });

// Seed default playlists if file doesn't exist
if (!fs.existsSync(playlistsFilePath)) {
  const defaultPlaylists = [
    { id: "favorites", name: "Favorites", description: "Your favorite local tracks", songIds: [], coverColor: "#fa2d48", createdAt: Date.now() },
    { id: "chill", name: "Chill Vibes", description: "Relaxing offline sounds", songIds: [], coverColor: "#4a72e8", createdAt: Date.now() }
  ];
  fs.writeFileSync(playlistsFilePath, JSON.stringify(defaultPlaylists, null, 2), "utf-8");
}

const metadataService = new MetadataService(artworkCacheDir, animatedCacheDir);

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    frame: true,
    backgroundMaterial: "acrylic",
    backgroundColor: "#00000000",
    autoHideMenuBar: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  setupCustomProtocol(protocol, net, artworkCacheDir, animatedCacheDir);

  registerIpcHandlers({
    getMainWindow: () => mainWindow,
    dbFilePath,
    playlistsFilePath,
    artworkCacheDir,
    animatedCacheDir,
    userDataPath,
    metadataService
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});