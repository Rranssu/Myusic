const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function hashString(str) {
  return crypto.createHash("md5").update(str).digest("hex");
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

async function parseTracks(filePaths, scannedFolder, artworkCacheDir, dbFilePath) {
  const { parseFile } = await import("music-metadata");
  const songs = [];
  const albumMap = new Map();
  const artistMap = new Map();

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];

    try {
      const meta = await parseFile(filePath, { duration: true, skipCovers: false });
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

module.exports = { getAudioFilesRecursive, parseTracks, hashString };