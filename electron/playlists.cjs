const fs = require("fs");

function readPlaylists(playlistsFilePath) {
  if (fs.existsSync(playlistsFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(playlistsFilePath, "utf-8"));
    } catch (err) {
      console.error("Failed to read playlists:", err);
    }
  }
  return [];
}

function savePlaylist(playlistsFilePath, playlist) {
  const playlists = readPlaylists(playlistsFilePath);
  const existingIdx = playlists.findIndex((p) => p.id === playlist.id);

  if (existingIdx !== -1) {
    playlists[existingIdx] = playlist;
  } else {
    playlists.push(playlist);
  }

  fs.writeFileSync(playlistsFilePath, JSON.stringify(playlists, null, 2), "utf-8");
  console.log(`[Playlists] 💾 Saved playlist: "${playlist.name}" (${playlist.songIds.length} tracks)`);
  return playlists;
}

function deletePlaylist(playlistsFilePath, playlistId) {
  let playlists = readPlaylists(playlistsFilePath);
  playlists = playlists.filter((p) => p.id !== playlistId);

  fs.writeFileSync(playlistsFilePath, JSON.stringify(playlists, null, 2), "utf-8");
  console.log(`[Playlists] 🗑️ Deleted playlist ID: ${playlistId}`);
  return playlists;
}

module.exports = { readPlaylists, savePlaylist, deletePlaylist };