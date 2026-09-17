const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, net, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { Readable } = require("stream");
const { MetadataService } = require("./metadataService.cjs");

// Ensure application name is locked for consistent AppData storage
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

let userDataPath = "";
let artworkCacheDir = "";
let animatedCacheDir = "";
let dbFilePath = "";
let playlistsFilePath = "";
let mainWindow = null;
let metadataService = null;

function hashString(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

function initPaths() {
  userDataPath = app.getPath("userData");
  artworkCacheDir = path.join(userDataPath, "artwork_cache");
  animatedCacheDir = path.join(userDataPath, "animated_cache");
  dbFilePath = path.join(userDataPath, "library.json");
  playlistsFilePath = path.join(userDataPath, "playlists.json");

  if (!fs.existsSync(artworkCacheDir)) {
    fs.mkdirSync(artworkCacheDir, { recursive: true });
  }
  if (!fs.existsSync(animatedCacheDir)) {
    fs.mkdirSync(animatedCacheDir, { recursive: true });
  }

  // Seed default playlists if file doesn't exist
  if (!fs.existsSync(playlistsFilePath)) {
    const defaultPlaylists = [
      {
        id: "favorites",
        name: "Favorites",
        description: "Your favorite local tracks",
        songIds: [],
        coverColor: "#fa2d48",
        createdAt: Date.now()
      },
      {
        id: "chill",
        name: "Chill Vibes",
        description: "Relaxing offline sounds",
        songIds: [],
        coverColor: "#4a72e8",
        createdAt: Date.now()
      }
    ];
    fs.writeFileSync(playlistsFilePath, JSON.stringify(defaultPlaylists, null, 2), "utf-8");
  }

  metadataService = new MetadataService(artworkCacheDir, animatedCacheDir);
}

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    frame: false, // Frameless window matching modern desktop aesthetic
    backgroundMaterial: "acrylic", // Windows 11 frosted acrylic vibrancy
    backgroundColor: "#00000000",
    autoHideMenuBar: true,

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
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".mp4": "video/mp4",
    ".webm": "video/webm"
  };
  return mimeMap[ext] || "application/octet-stream";
}

function setupCustomProtocol() {
  protocol.handle("atom", async (request) => {
    try {
      const urlObj = new URL(request.url);

      // 1. Static Artwork Route
      if (urlObj.hostname === "artwork") {
        const fileName = decodeURIComponent(urlObj.pathname.slice(1));
        const fullPath = path.join(artworkCacheDir, fileName);

        if (fs.existsSync(fullPath)) {
          const buffer = fs.readFileSync(fullPath);
          return new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": getMimeType(fullPath),
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=31536000"
            }
          });
        }
      }

      // 2. Animated Artwork Video Route (.mp4 with HTTP 206 Range seeking)
      if (urlObj.hostname === "animated") {
        const fileName = decodeURIComponent(urlObj.pathname.slice(1));
        const fullPath = path.join(animatedCacheDir, fileName);

        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
          const fileSize = stat.size;
          const rangeHeader = request.headers.get("range");

          if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const nodeStream = fs.createReadStream(fullPath, { start, end });
            const webStream = Readable.toWeb(nodeStream);

            return new Response(webStream, {
              status: 206,
              statusText: "Partial Content",
              headers: {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize.toString(),
                "Content-Type": "video/mp4",
                "Access-Control-Allow-Origin": "*"
              }
            });
          }

          const nodeStream = fs.createReadStream(fullPath);
          const webStream = Readable.toWeb(nodeStream);
          return new Response(webStream, {
            status: 200,
            headers: {
              "Content-Type": "video/mp4",
              "Content-Length": fileSize.toString(),
              "Accept-Ranges": "bytes",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }

      // 3. Audio Track Route with HTTP 206 Range Seeking
      if (urlObj.hostname === "track") {
        const rawTrackPath = decodeURIComponent(urlObj.searchParams.get("path") || "");
        if (!fs.existsSync(rawTrackPath)) {
          return new Response("Audio file not found", { status: 404 });
        }

        const stat = fs.statSync(rawTrackPath);
        const fileSize = stat.size;
        const contentType = getMimeType(rawTrackPath);
        const rangeHeader = request.headers.get("range");

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

          if (start >= fileSize) {
            return new Response("Requested range not satisfiable", {
              status: 416,
              headers: { "Content-Range": `bytes */${fileSize}` }
            });
          }

          const chunkSize = end - start + 1;
          const nodeStream = fs.createReadStream(rawTrackPath, { start, end });
          const webStream = Readable.toWeb(nodeStream);

          return new Response(webStream, {
            status: 206,
            statusText: "Partial Content",
            headers: {
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
              "Content-Length": chunkSize.toString(),
              "Content-Type": contentType,
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

        const nodeStream = fs.createReadStream(rawTrackPath);
        const webStream = Readable.toWeb(nodeStream);

        return new Response(webStream, {
          status: 200,
          headers: {
            "Content-Length": fileSize.toString(),
            "Accept-Ranges": "bytes",
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      // 4. Fallback Route
      let rawPath = decodeURIComponent(request.url.slice("atom://".length));
      if (/^[a-zA-Z]\//.test(rawPath)) {
        rawPath = rawPath[0].toUpperCase() + ":/" + rawPath.slice(2);
      } else if (rawPath.startsWith("/") && process.platform === "win32") {
        rawPath = rawPath.slice(1);
      }

      if (fs.existsSync(rawPath)) {
        return net.fetch(pathToFileURL(rawPath).toString());
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Protocol error:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
}

function getAudioFilesRecursive(dir, fileList = []) {
  const supportedExtensions = new Set([".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"]);
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        getAudioFilesRecursive(fullPath, fileList);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (supportedExtensions.has(ext)) {
          fileList.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error("Error reading dir:", dir, err);
  }
  return fileList;
}

async function parseTracks(filePaths, scannedFolder = "") {
  const { parseFile } = await import("music-metadata");
  const songs = [];
  const albumMap = new Map();
  const artistMap = new Map();

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];

    try {
      const meta = await parseFile(filePath, { duration: true, skipCovers: false });
      // Cryptographic MD5 hash of full file path ensures zero ID collisions
      const id = hashString(filePath);

      const title = meta.common.title || path.basename(filePath, path.extname(filePath));
      const artist = meta.common.artist || meta.common.albumartist || "Unknown Artist";
      const album = meta.common.album || "Unknown Album";
      const duration = Math.round(meta.format.duration || 0);
      const trackNumber = meta.common.track?.no || undefined;
      const year = meta.common.year || undefined;

      let artworkUrl = "";
      if (meta.common.picture && meta.common.picture.length > 0) {
        const pic = meta.common.picture[0];
        const ext = pic.format && pic.format.includes("png") ? ".png" : ".jpg";
        const albumSlug = hashString(`${artist}-${album}`);
        const artworkFileName = `${albumSlug}${ext}`;
        const artworkDiskPath = path.join(artworkCacheDir, artworkFileName);

        if (!fs.existsSync(artworkDiskPath)) {
          fs.writeFileSync(artworkDiskPath, pic.data);
        }
        artworkUrl = `atom://artwork/${artworkFileName}`;
      }

      const song = {
        id,
        filePath,
        title,
        artist,
        album,
        duration,
        trackNumber,
        year,
        artworkUrl
      };

      songs.push(song);

      const albumKey = `${artist}-${album}`;
      if (!albumMap.has(albumKey)) {
        albumMap.set(albumKey, {
          id: hashString(albumKey),
          title: album,
          artist,
          year,
          artworkUrl,
          songCount: 1,
          songs: [song]
        });
      } else {
        const existing = albumMap.get(albumKey);
        existing.songCount += 1;
        existing.songs.push(song);
        if (!existing.artworkUrl && artworkUrl) existing.artworkUrl = artworkUrl;
      }

      if (!artistMap.has(artist)) {
        artistMap.set(artist, {
          id: hashString(artist),
          name: artist,
          albumCount: 1,
          songCount: 1,
          artworkUrl
        });
      } else {
        const existing = artistMap.get(artist);
        existing.songCount += 1;
        if (!existing.artworkUrl && artworkUrl) existing.artworkUrl = artworkUrl;
      }

    } catch (err) {
      console.warn("Failed to parse metadata for:", filePath, err.message);
    }
  }

  for (const [artistName, artistObj] of artistMap.entries()) {
    let distinctAlbums = 0;
    for (const albumObj of albumMap.values()) {
      if (albumObj.artist === artistName) distinctAlbums++;
    }
    artistObj.albumCount = distinctAlbums;
  }

  const libraryData = {
    folder: scannedFolder,
    songs,
    albums: Array.from(albumMap.values()),
    artists: Array.from(artistMap.values()),
    lastScanned: Date.now()
  };

  fs.writeFileSync(dbFilePath, JSON.stringify(libraryData, null, 2), "utf-8");
  return libraryData;
}

// =======================================================
// IPC HANDLERS
// =======================================================

// Native folder picker
ipcMain.handle("dialog:selectAndScanFolder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Music Folder",
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedFolder = result.filePaths[0];
  const audioFiles = getAudioFilesRecursive(selectedFolder);
  const libraryData = await parseTracks(audioFiles, selectedFolder);
  return libraryData;
});

// Library DB getter with legacy ID auto-repair
ipcMain.handle("db:getLibrary", async () => {
  if (fs.existsSync(dbFilePath)) {
    try {
      const data = fs.readFileSync(dbFilePath, "utf-8");
      const parsed = JSON.parse(data);

      let repaired = false;
      if (parsed.songs && parsed.songs.length > 1) {
        const idSet = new Set();
        for (const s of parsed.songs) {
          if (idSet.has(s.id)) {
            repaired = true;
            break;
          }
          idSet.add(s.id);
        }

        if (repaired) {
          console.log("[Myusic DB] 🛠️  Repairing legacy duplicate song IDs using MD5 hashes...");
          parsed.songs.forEach(s => {
            s.id = hashString(s.filePath);
          });
          fs.writeFileSync(dbFilePath, JSON.stringify(parsed, null, 2), "utf-8");
        }
      }

      return parsed;
    } catch (err) {
      console.error("Failed to read local library db", err);
    }
  }
  return { folder: "", songs: [], albums: [], artists: [], lastScanned: 0 };
});

// Lyrics retrieval and on-demand cache
ipcMain.handle("lyrics:getLyrics", async (_event, song) => {
  if (!song || !song.filePath) return null;

  const songHash = hashString(song.filePath);
  const lyricsCacheDir = path.join(userDataPath, "lyrics_cache");
  if (!fs.existsSync(lyricsCacheDir)) {
    fs.mkdirSync(lyricsCacheDir, { recursive: true });
  }

  const cacheFile = path.join(lyricsCacheDir, `${songHash}.json`);

  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    } catch (e) {}
  }

  const lyricsData = await metadataService.fetchLyrics(song);
  if (lyricsData) {
    fs.writeFileSync(cacheFile, JSON.stringify(lyricsData, null, 2), "utf-8");
  }

  return lyricsData;
});

// Window controls
ipcMain.on("window:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window:maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on("window:close", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("window:isMaximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Show file in Windows File Explorer
ipcMain.handle("system:showItemInFolder", (_event, fullPath) => {
  if (fs.existsSync(fullPath)) {
    shell.showItemInFolder(fullPath);
    return true;
  }
  return false;
});

// Single-album targeted fetch
ipcMain.handle("metadata:fetchForAlbum", async (_event, artist, albumTitle) => {
  if (!fs.existsSync(dbFilePath)) return null;
  try {
    const library = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
    const result = await metadataService.resolveAlbum(artist, albumTitle);

    const targetAlbum = library.albums.find(a => a.title.toLowerCase() === albumTitle.toLowerCase());
    if (targetAlbum && result) {
      if (result.artworkUrl) targetAlbum.artworkUrl = result.artworkUrl;
      if (result.animatedArtworkUrl) targetAlbum.animatedArtworkUrl = result.animatedArtworkUrl;
      if (result.year) targetAlbum.year = result.year;
      if (result.genre) targetAlbum.genre = result.genre;
      if (result.description) targetAlbum.description = result.description;

      library.songs.forEach(s => {
        if (s.album.toLowerCase() === albumTitle.toLowerCase()) {
          if (result.artworkUrl) s.artworkUrl = result.artworkUrl;
          if (result.animatedArtworkUrl) s.animatedArtworkUrl = result.animatedArtworkUrl;
        }
      });

      fs.writeFileSync(dbFilePath, JSON.stringify(library, null, 2), "utf-8");
      return library;
    }
  } catch (err) {
    console.error("Single album fetch error:", err);
  }
  return null;
});

// 1. Static Metadata Downloader
ipcMain.handle("metadata:fetchStatic", async () => {
  if (!fs.existsSync(dbFilePath)) return null;
  try {
    const library = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
    console.log(`\n[Static Metadata Scraper] 🖼️  Scanning ${library.albums.length} albums for missing covers & descriptions...`);
    let updated = false;

    for (const album of library.albums) {
      const staticData = await metadataService.fetchStaticMetadata(album.artist, album.title);
      const description = await metadataService.fetchAlbumDescription(album.artist, album.title);

      if (staticData?.artworkUrl && !album.artworkUrl) {
        album.artworkUrl = staticData.artworkUrl;
        updated = true;
        library.songs.forEach((s) => {
          if (s.album.toLowerCase() === album.title.toLowerCase() && !s.artworkUrl) {
            s.artworkUrl = staticData.artworkUrl;
          }
        });
      }

      if (staticData?.year && !album.year) {
        album.year = staticData.year;
        updated = true;
      }
      if (staticData?.genre && !album.genre) {
        album.genre = staticData.genre;
        updated = true;
      }
      if (description && !album.description) {
        album.description = description;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(dbFilePath, JSON.stringify(library, null, 2), "utf-8");
    }
    console.log(`[Static Metadata Scraper] ✅ Complete!\n`);
    return library;
  } catch (err) {
    console.error("[Static Metadata Scraper] ❌ Error:", err);
    return null;
  }
});

// 2. Animated Artwork Downloader
ipcMain.handle("metadata:fetchAnimated", async () => {
  if (!fs.existsSync(dbFilePath)) return null;
  try {
    const library = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
    console.log(`\n[Animated Scraper] 🎬 Checking ${library.albums.length} albums for Apple Music video loops...`);
    let updated = false;

    for (const album of library.albums) {
      const needsAnimated = !album.animatedArtworkUrl || !album.animatedArtworkUrl.startsWith("atom://animated/");
      if (needsAnimated) {
        const animatedUrl = await metadataService.fetchAnimatedArtwork(album.artist, album.title);
        if (animatedUrl) {
          album.animatedArtworkUrl = animatedUrl;
          updated = true;
          library.songs.forEach((s) => {
            if (s.album.toLowerCase() === album.title.toLowerCase()) {
              s.animatedArtworkUrl = animatedUrl;
            }
          });
        }
      }
    }

    if (updated) {
      fs.writeFileSync(dbFilePath, JSON.stringify(library, null, 2), "utf-8");
    }
    console.log(`[Animated Scraper] ✅ Complete!\n`);
    return library;
  } catch (err) {
    console.error("[Animated Scraper] ❌ Error:", err);
    return null;
  }
});

// 3. Artist Portraits & Biographies
ipcMain.handle("metadata:fetchArtist", async () => {
  if (!fs.existsSync(dbFilePath)) return null;
  try {
    const library = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
    console.log(`\n[Artist Scraper] 👥 Checking ${library.artists.length} artists for portraits & biographies...`);
    let updated = false;

    for (const artist of library.artists) {
      const needsPortrait = !artist.artworkUrl || !artist.artworkUrl.includes("artist_");
      const needsBio = !artist.description;

      if (needsPortrait || needsBio) {
        const result = await metadataService.fetchArtistMetadata(artist.name);
        if (result) {
          if (result.artworkUrl) {
            artist.artworkUrl = result.artworkUrl;
            updated = true;
          }
          if (result.description) {
            artist.description = result.description;
            updated = true;
          }
        }
      }
    }

    if (updated) {
      fs.writeFileSync(dbFilePath, JSON.stringify(library, null, 2), "utf-8");
    }
    console.log(`[Artist Scraper] ✅ Complete!\n`);
    return library;
  } catch (err) {
    console.error("[Artist Scraper] ❌ Error:", err);
    return null;
  }
});

// 4. Batch Lyrics Downloader
ipcMain.handle("metadata:fetchLyrics", async () => {
  if (!fs.existsSync(dbFilePath)) return null;
  try {
    const library = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
    const lyricsCacheDir = path.join(userDataPath, "lyrics_cache");
    if (!fs.existsSync(lyricsCacheDir)) {
      fs.mkdirSync(lyricsCacheDir, { recursive: true });
    }

    console.log(`\n[Lyrics Batch] 📝 Checking ${library.songs.length} songs for offline lyrics...`);
    let downloadedCount = 0;

    for (const song of library.songs) {
      const songHash = hashString(song.filePath);
      const cacheFile = path.join(lyricsCacheDir, `${songHash}.json`);
      if (!fs.existsSync(cacheFile)) {
        const lyricsData = await metadataService.fetchLyrics(song);
        if (lyricsData) {
          fs.writeFileSync(cacheFile, JSON.stringify(lyricsData, null, 2), "utf-8");
          console.log(`[Lyrics Batch] 💾 Saved lyrics to cache: ${song.title}`);
          downloadedCount++;
        }
        await new Promise(r => setTimeout(r, 120));
      }
    }

    console.log(`[Lyrics Batch] ✅ Complete! Downloaded ${downloadedCount} new lyrics files.\n`);
    return { success: true, count: downloadedCount };
  } catch (err) {
    console.error("[Lyrics Batch] ❌ Error:", err);
    return null;
  }
});

// Playlists Database
function readPlaylists() {
  if (fs.existsSync(playlistsFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(playlistsFilePath, "utf-8"));
    } catch (err) {
      console.error("Failed to read playlists:", err);
    }
  }
  return [];
}

ipcMain.handle("playlists:get", async () => {
  return readPlaylists();
});

ipcMain.handle("playlists:save", async (_event, playlist) => {
  const playlists = readPlaylists();
  const existingIdx = playlists.findIndex((p) => p.id === playlist.id);

  if (existingIdx !== -1) {
    playlists[existingIdx] = playlist;
  } else {
    playlists.push(playlist);
  }

  fs.writeFileSync(playlistsFilePath, JSON.stringify(playlists, null, 2), "utf-8");
  console.log(`[Playlists] 💾 Saved playlist: "${playlist.name}" (${playlist.songIds.length} tracks)`);
  return playlists;
});

ipcMain.handle("playlists:delete", async (_event, playlistId) => {
  let playlists = readPlaylists();
  playlists = playlists.filter((p) => p.id !== playlistId);

  fs.writeFileSync(playlistsFilePath, JSON.stringify(playlists, null, 2), "utf-8");
  console.log(`[Playlists] 🗑️ Deleted playlist ID: ${playlistId}`);
  return playlists;
});

app.whenReady().then(() => {
  initPaths();
  setupCustomProtocol();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});