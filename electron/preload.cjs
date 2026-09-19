const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  selectAndScanFolder: () => ipcRenderer.invoke("dialog:selectAndScanFolder"),
  getLibrary: () => ipcRenderer.invoke("db:getLibrary"),
  getLyrics: (song) => ipcRenderer.invoke("lyrics:getLyrics", song),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow: () => ipcRenderer.send("window:close"),
  isWindowMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  toggleFullScreen: () => ipcRenderer.invoke("window:toggleFullScreen"),
  isFullScreen: () => ipcRenderer.invoke("window:isFullScreen"),

  // Dedicated Downloader Methods
  fetchStaticMetadata: () => ipcRenderer.invoke("metadata:fetchStatic"),
  fetchAnimatedMetadata: () => ipcRenderer.invoke("metadata:fetchAnimated"),
  fetchArtistMetadata: () => ipcRenderer.invoke("metadata:fetchArtist"),
  fetchLyricsMetadata: () => ipcRenderer.invoke("metadata:fetchLyrics"),
  fetchForAlbum: (artist, album) => ipcRenderer.invoke("metadata:fetchForAlbum", artist, album),

  // Playlists
  getPlaylists: () => ipcRenderer.invoke("playlists:get"),
  savePlaylist: (playlist) => ipcRenderer.invoke("playlists:save", playlist),
  deletePlaylist: (playlistId) => ipcRenderer.invoke("playlists:delete", playlistId),

  // System
  showItemInFolder: (fullPath) => ipcRenderer.invoke("system:showItemInFolder", fullPath),

  // Phase 6 Analytics & Recommendations
  recordPlay: (song) => ipcRenderer.invoke("stats:recordPlay", song),
  getStats: () => ipcRenderer.invoke("stats:get"),
  getSimilarArtists: (artistName) => ipcRenderer.invoke("recommendations:getSimilarArtists", artistName),
  getDiscoverTracks: (artistName) => ipcRenderer.invoke("recommendations:getDiscoverTracks", artistName)
});