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

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    frame: false,
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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Restore F12 and Ctrl + Shift + I
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (
      input.key === "F12" ||
      (input.control && input.shift && input.key.toLowerCase() === "i")
    ) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (
      (input.control && input.key.toLowerCase() === "r") ||
      input.key === "F5"
    ) {
      mainWindow.reload();
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  // CRITICAL: Must be called inside whenReady so AppData path resolves to /myusic/
  const userDataPath = app.getPath("userData");
  const artworkCacheDir = path.join(userDataPath, "artwork_cache");
  const animatedCacheDir = path.join(userDataPath, "animated_cache");
  const dbFilePath = path.join(userDataPath, "library.json");
  const playlistsFilePath = path.join(userDataPath, "playlists.json");

  console.log("[Myusic Storage] UserData path:", userDataPath);
  console.log("[Myusic Storage] Animated Cache dir:", animatedCacheDir);

  if (!fs.existsSync(artworkCacheDir)) fs.mkdirSync(artworkCacheDir, { recursive: true });
  if (!fs.existsSync(animatedCacheDir)) fs.mkdirSync(animatedCacheDir, { recursive: true });

  if (!fs.existsSync(playlistsFilePath)) {
    const defaultPlaylists = [
      { id: "favorites", name: "Favorites", description: "Your favorite local tracks", songIds: [], coverColor: "#fa2d48", createdAt: Date.now() },
      { id: "chill", name: "Chill Vibes", description: "Relaxing offline sounds", songIds: [], coverColor: "#4a72e8", createdAt: Date.now() }
    ];
    fs.writeFileSync(playlistsFilePath, JSON.stringify(defaultPlaylists, null, 2), "utf-8");
  }

  const metadataService = new MetadataService(artworkCacheDir, animatedCacheDir);

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