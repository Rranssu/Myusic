const fs = require("fs");
const path = require("path");
const { dialog, ipcMain, shell } = require("electron");
const { getAudioFilesRecursive, parseTracks, hashString } = require("./scanner.cjs");
const { readPlaylists, savePlaylist, deletePlaylist } = require("./playlists.cjs");
const { searchOnlineTracks, getAudioStreamUrl } = require("./streamingService.cjs");

function registerIpcHandlers({
  getMainWindow,
  dbFilePath,
  playlistsFilePath,
  artworkCacheDir,
  animatedCacheDir,
  userDataPath,
  metadataService
}) {
  // 1. Native Folder Scanner
  ipcMain.handle("dialog:selectAndScanFolder", async () => {
    const mainWindow = getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select Music Folder",
      properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const selectedFolder = result.filePaths[0];
    const audioFiles = getAudioFilesRecursive(selectedFolder);
    return parseTracks(audioFiles, selectedFolder, artworkCacheDir, dbFilePath);
  });

  // 2. Library Database Getter
  ipcMain.handle("db:getLibrary", async () => {
    if (fs.existsSync(dbFilePath)) {
      try {
        const data = fs.readFileSync(dbFilePath, "utf-8");
        const parsed = JSON.parse(data);

        // Auto-repair legacy collided IDs if needed
        let repaired = false;
        if (parsed.songs && parsed.songs.length > 1) {
          const idSet = new Set();
          for (const s of parsed.songs) {
            if (idSet.has(s.id)) { repaired = true; break; }
            idSet.add(s.id);
          }

          if (repaired) {
            console.log("[Myusic DB] 🛠️  Repairing legacy duplicate song IDs...");
            parsed.songs.forEach(s => { s.id = hashString(s.filePath); });
            fs.writeFileSync(dbFilePath, JSON.stringify(parsed, null, 2), "utf-8");
          }
        }
        return parsed;
      } catch (err) {
        console.error("Failed to read library db:", err);
      }
    }
    return { folder: "", songs: [], albums: [], artists: [], lastScanned: 0 };
  });

  // 3. Lyrics on-demand retrieval and cache
  ipcMain.handle("lyrics:getLyrics", async (_event, song) => {
    if (!song || !song.filePath) return null;

    const songHash = hashString(song.filePath);
    const lyricsCacheDir = path.join(userDataPath, "lyrics_cache");
    if (!fs.existsSync(lyricsCacheDir)) fs.mkdirSync(lyricsCacheDir, { recursive: true });

    const cacheFile = path.join(lyricsCacheDir, `${songHash}.json`);
    if (fs.existsSync(cacheFile)) {
      try { return JSON.parse(fs.readFileSync(cacheFile, "utf-8")); } catch (e) {}
    }

    const lyricsData = await metadataService.fetchLyrics(song);
    if (lyricsData) {
      fs.writeFileSync(cacheFile, JSON.stringify(lyricsData, null, 2), "utf-8");
    }
    return lyricsData;
  });

  // 4. Window Controls
  ipcMain.on("window:minimize", () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });

  ipcMain.on("window:maximize", () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on("window:close", () => {
    const win = getMainWindow();
    if (win) win.close();
  });

  ipcMain.handle("window:isMaximized", () => {
    const win = getMainWindow();
    return win ? win.isMaximized() : false;
  });

  // 5. System File Explorer
  ipcMain.handle("system:showItemInFolder", (_event, fullPath) => {
    if (fs.existsSync(fullPath)) {
      shell.showItemInFolder(fullPath);
      return true;
    }
    return false;
  });

  // 6. Targeted Single-Album Lookup
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

  // 7. Online Search & Streaming Audio Resolution
  ipcMain.handle("streaming:search", async (_event, query) => {
    return searchOnlineTracks(query);
  });

  ipcMain.handle("streaming:getAudioUrl", async (_event, videoId) => {
    return getAudioStreamUrl(videoId);
  });

  ipcMain.handle("metadata:fetchStatic", async () => {
    if (!fs.existsSync(dbFilePath)) return null;
    try {
      const library = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
      console.log(`\n[Static Scraper] 🖼️  Scanning ${library.albums.length} albums...`);
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
        if (staticData?.year && !album.year) { album.year = staticData.year; updated = true; }
        if (staticData?.genre && !album.genre) { album.genre = staticData.genre; updated = true; }
        if (description && !album.description) { album.description = description; updated = true; }
      }

      if (updated) fs.writeFileSync(dbFilePath, JSON.stringify(library, null, 2), "utf-8");
      return library;
    } catch (err) {
      console.error("[Static Scraper] ❌ Error:", err);
      return null;
    }
  });

  ipcMain.handle("metadata:fetchAnimated", async () => {
    if (!fs.existsSync(dbFilePath)) return null;
    try {
      const library = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
      console.log(`\n[Animated Scraper] 🎬 Checking ${library.albums.length} albums...`);
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

      if (updated) fs.writeFileSync(dbFilePath, JSON.stringify(library, null, 2), "utf-8");
      return library;
    } catch (err) {
      console.error("[Animated Scraper] ❌ Error:", err);
      return null;
    }
  });

  ipcMain.handle("metadata:fetchArtist", async () => {
    if (!fs.existsSync(dbFilePath)) return null;
    try {
      const library = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
      console.log(`\n[Artist Scraper] 👥 Checking ${library.artists.length} artists...`);
      let updated = false;

      for (const artist of library.artists) {
        const needsPortrait = !artist.artworkUrl || !artist.artworkUrl.includes("artist_");
        const needsBio = !artist.description;

        if (needsPortrait || needsBio) {
          const result = await metadataService.fetchArtistMetadata(artist.name);
          if (result) {
            if (result.artworkUrl) { artist.artworkUrl = result.artworkUrl; updated = true; }
            if (result.description) { artist.description = result.description; updated = true; }
          }
        }
      }

      if (updated) fs.writeFileSync(dbFilePath, JSON.stringify(library, null, 2), "utf-8");
      return library;
    } catch (err) {
      console.error("[Artist Scraper] ❌ Error:", err);
      return null;
    }
  });

  ipcMain.handle("metadata:fetchLyrics", async () => {
    if (!fs.existsSync(dbFilePath)) return null;
    try {
      const library = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
      const lyricsCacheDir = path.join(userDataPath, "lyrics_cache");
      if (!fs.existsSync(lyricsCacheDir)) fs.mkdirSync(lyricsCacheDir, { recursive: true });

      console.log(`\n[Lyrics Batch] 📝 Checking ${library.songs.length} songs for lyrics...`);
      let count = 0;

      for (const song of library.songs) {
        const songHash = hashString(song.filePath);
        const cacheFile = path.join(lyricsCacheDir, `${songHash}.json`);
        if (!fs.existsSync(cacheFile)) {
          const lyricsData = await metadataService.fetchLyrics(song);
          if (lyricsData) {
            fs.writeFileSync(cacheFile, JSON.stringify(lyricsData, null, 2), "utf-8");
            count++;
          }
          await new Promise(r => setTimeout(r, 120));
        }
      }

      return { success: true, count };
    } catch (err) {
      console.error("[Lyrics Batch] ❌ Error:", err);
      return null;
    }
  });

  // 8. Playlists
  ipcMain.handle("playlists:get", async () => readPlaylists(playlistsFilePath));
  ipcMain.handle("playlists:save", async (_event, pl) => savePlaylist(playlistsFilePath, pl));
  ipcMain.handle("playlists:delete", async (_event, id) => deletePlaylist(playlistsFilePath, id));
}

module.exports = { registerIpcHandlers };