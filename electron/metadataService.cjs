const fs = require("fs");
const path = require("path");

class MetadataService {
  constructor(artworkCacheDir, animatedCacheDir) {
    this.artworkCacheDir = artworkCacheDir;
    this.animatedCacheDir = animatedCacheDir;

    if (!fs.existsSync(this.animatedCacheDir)) {
      fs.mkdirSync(this.animatedCacheDir, { recursive: true });
    }
  }

  // 1. Fetch High-Res Static Artwork + Year + Genre via iTunes
  async fetchStaticMetadata(artist, album) {
    try {
      console.log(`[Metadata] 🔍 Searching iTunes: "${artist}" — "${album}"`);
      const query = encodeURIComponent(`${artist} ${album}`);
      const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;

      const res = await fetch(url);
      if (!res.ok) {
        console.log(`[Metadata] ⚠️ iTunes API responded with status ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        console.log(`[Metadata] ℹ️  No commercial release found on iTunes for "${album}".`);
        return null;
      }

      const item = data.results[0];
      const highResArtUrl = item.artworkUrl100
        ? item.artworkUrl100.replace("100x100bb.jpg", "1000x1000bb.jpg")
        : null;

      const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined;
      const genre = item.primaryGenreName || undefined;

      let localArtworkUrl = null;
      if (highResArtUrl) {
        const albumSlug = require("crypto").createHash("md5").update(`${artist}-${album}`).digest("hex");
        const fileName = `${albumSlug}.jpg`;
        const diskPath = path.join(this.artworkCacheDir, fileName);

        if (!fs.existsSync(diskPath)) {
          console.log(`[Static Art] 🖼️  Found high-res 1000px cover. Downloading...`);
          const imgRes = await fetch(highResArtUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(diskPath, buffer);
            console.log(`[Static Art] ✅ Saved static cover to cache: ${fileName}`);
          }
        } else {
          console.log(`[Static Art] ⚡ Already cached locally on disk: ${fileName}`);
        }
        localArtworkUrl = `atom://artwork/${fileName}`;
      }

      return {
        artworkUrl: localArtworkUrl,
        year,
        genre
      };
    } catch (err) {
      console.warn(`[Metadata] ⚠️ Error querying static metadata:`, err.message);
      return null;
    }
  }

  // 2. Fetch Album Editorial Summary from Wikipedia REST API
  async fetchAlbumDescription(artist, album) {
    try {
      console.log(`[Description] 📖 Searching Wikipedia for "${album}" editorial notes...`);
      const searchQuery = encodeURIComponent(`${album} ${artist} album`);
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&utf8=&format=json`,
        { headers: { "User-Agent": "Myusic/1.0 ( desktop music player )" } }
      );
      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();
      const firstHit = searchData?.query?.search?.[0];
      if (!firstHit || !firstHit.title) return null;

      const summaryRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.title)}`,
        { headers: { "User-Agent": "Myusic/1.0 ( desktop music player )" } }
      );
      if (!summaryRes.ok) return null;
      const summaryData = await summaryRes.json();

      if (summaryData && summaryData.extract) {
        console.log(`[Description] ✅ Retrieved Wikipedia summary for "${album}"!`);
        return summaryData.extract;
      }
      return null;
    } catch (err) {
      console.log(`[Description] ℹ️  No description found (${err.message}).`);
      return null;
    }
  }

  extractVideoUrl(data) {
    if (!data) return null;
    if (typeof data === "string" && data.startsWith("http")) return data;
    if (typeof data.url === "string") return data.url;
    if (typeof data.square === "string") return data.square;
    if (typeof data.squareUrl === "string") return data.squareUrl;
    if (typeof data.videoUrl === "string") return data.videoUrl;

    if (data.square && typeof data.square === "object") {
      if (data.square.url) return data.square.url;
      if (data.square.videoUrl) return data.square.videoUrl;
      if (data.square.m3u8) return data.square.m3u8;
    }

    if (Array.isArray(data) && data.length > 0) {
      return this.extractVideoUrl(data[0]);
    }

    for (const key of Object.keys(data)) {
      const val = data[key];
      if (typeof val === "string" && val.startsWith("http") && (val.includes(".m3u8") || val.includes(".mp4"))) {
        return val;
      }
    }
    return null;
  }

  // Downloads Apple HLS segments and combines them into an offline H.264 .mp4
  async downloadHlsAsMp4(m3u8Url, targetDiskPath) {
    try {
      console.log(`[Animated Art] 📥 Resolving Apple HLS stream segments...`);

      const masterRes = await fetch(m3u8Url);
      if (!masterRes.ok) return false;
      const masterText = await masterRes.text();

      let streamUrl = m3u8Url;
      const lines = masterText.split("\n").map(l => l.trim()).filter(Boolean);

      // Look for AVC1 (H.264) stream which Chromium on Windows supports natively
      let chosenPlaylist = null;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("CODECS") && (lines[i].includes("avc1") || lines[i].includes("mp4a"))) {
          if (lines[i + 1] && !lines[i + 1].startsWith("#")) {
            chosenPlaylist = lines[i + 1];
            console.log(`[Animated Art] 🎯 Selected universal H.264 (avc1) stream`);
            break;
          }
        }
      }

      if (!chosenPlaylist) {
        chosenPlaylist = lines.find(l => !l.startsWith("#") && l.includes(".m3u8"));
      }

      if (chosenPlaylist) {
        streamUrl = new URL(chosenPlaylist, m3u8Url).toString();
      }

      const streamRes = await fetch(streamUrl);
      if (!streamRes.ok) return false;
      const streamText = await streamRes.text();

      const streamLines = streamText.split("\n").map(l => l.trim()).filter(Boolean);

      const mapMatch = streamText.match(/#EXT-X-MAP:URI="([^"]+)"/);
      let initUrl = null;
      if (mapMatch && mapMatch[1]) {
        initUrl = new URL(mapMatch[1], streamUrl).toString();
      }

      const segmentUrls = streamLines
        .filter(l => !l.startsWith("#") && (l.includes(".mp4") || l.includes(".m4s")))
        .map(l => new URL(l, streamUrl).toString());

      if (segmentUrls.length === 0 && !initUrl) {
        console.log(`[Animated Art] ⚠️ Could not parse video fragments from M3U8.`);
        return false;
      }

      console.log(`[Animated Art] 📦 Downloading H.264 video segments...`);

      const buffers = [];

      if (initUrl) {
        const initRes = await fetch(initUrl);
        if (initRes.ok) {
          buffers.push(Buffer.from(await initRes.arrayBuffer()));
        }
      }

      for (const segUrl of segmentUrls) {
        const segRes = await fetch(segUrl);
        if (segRes.ok) {
          buffers.push(Buffer.from(await segRes.arrayBuffer()));
        }
      }

      if (buffers.length === 0) return false;

      const finalBuffer = Buffer.concat(buffers);
      fs.writeFileSync(targetDiskPath, finalBuffer);

      console.log(`[Animated Art] ✅ Successfully assembled offline H.264 video: ${path.basename(targetDiskPath)} (${Math.round(finalBuffer.length / 1024)} KB)`);
      return true;
    } catch (err) {
      console.warn(`[Animated Art] ⚠️ Failed to assemble HLS video:`, err.message);
      return false;
    }
  }

  // 3. Fetch Looping Animated Artwork (.mp4)
  async fetchAnimatedArtwork(artist, album) {
    try {
      console.log(`[Animated Art] 🎬 Checking Apple Music animated video streams for "${album}"...`);
      const queryArtist = encodeURIComponent(artist);
      const queryAlbum = encodeURIComponent(album);
      const apiUrl = `https://artwork.m8tec.top/api/v1/artwork/search?artist=${queryArtist}&album=${queryAlbum}`;

      const res = await fetch(apiUrl, {
        headers: { "User-Agent": "Myusic/1.0" }
      });

      if (!res.ok) {
        console.log(`[Animated Art] ℹ️  API responded with status: ${res.status}`);
        return null;
      }

      const data = await res.json();
      const videoUrl = this.extractVideoUrl(data);

      if (!videoUrl) {
        console.log(`[Animated Art] ℹ️  No animated cover found for "${album}".`);
        return null;
      }

      console.log(`[Animated Art] ✨ Found animated stream URL: ${videoUrl}`);

      const albumSlug = require("crypto").createHash("md5").update(`${artist}-${album}`).digest("hex");
      const fileName = `${albumSlug}.mp4`;
      const diskPath = path.join(this.animatedCacheDir, fileName);

      if (fs.existsSync(diskPath) && fs.statSync(diskPath).size > 1000) {
        console.log(`[Animated Art] ⚡ Already cached locally in animated_cache: ${fileName}`);
        return `atom://animated/${fileName}`;
      }

      if (videoUrl.includes(".mp4") && !videoUrl.includes(".m3u8")) {
        console.log(`[Animated Art] 📥 Downloading direct .mp4 file...`);
        const vidRes = await fetch(videoUrl);
        if (vidRes.ok) {
          const buffer = Buffer.from(await vidRes.arrayBuffer());
          fs.writeFileSync(diskPath, buffer);
          console.log(`[Animated Art] ✅ Successfully saved: ${fileName}`);
          return `atom://animated/${fileName}`;
        }
      }

      if (videoUrl.includes(".m3u8")) {
        const success = await this.downloadHlsAsMp4(videoUrl, diskPath);
        if (success) {
          return `atom://animated/${fileName}`;
        }
      }

      return null;
    } catch (err) {
      console.log(`[Animated Art] ⚠️ Error processing animated cover:`, err.message);
      return null;
    }
  }

  // 4. Fetch Artist Studio Portrait & Biography (Wikipedia + Deezer)
// 3. Fetch Wide Landscape Artist Banner (TheAudioDB 1080p Fanart + Wikipedia + Deezer)
  async fetchArtistMetadata(artistName) {
    try {
      console.log(`[Artist Metadata] 🔍 Searching wide landscape banner & biography for "${artistName}"...`);
      let description = null;
      let photoUrl = null;

      // A. Priority 1: TheAudioDB (Specialized 16:9 / 1920x1080 Landscape Backdrops)
      try {
        const adbUrl = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(artistName)}`;
        const adbRes = await fetch(adbUrl);
        if (adbRes.ok) {
          const adbData = await adbRes.json();
          const adbArtist = adbData?.artists?.[0];
          if (adbArtist) {
            // Pick native 16:9 wide fanart or landscape thumbnail
            photoUrl = adbArtist.strArtistFanart || adbArtist.strArtistWideThumb || adbArtist.strArtistBanner || null;

            if (adbArtist.strBiographyEN) {
              const sentences = adbArtist.strBiographyEN.split(". ").slice(0, 3).join(". ") + ".";
              description = sentences;
            }

            if (photoUrl) {
              console.log(`[Artist Metadata] 🌄 Found TheAudioDB 1080p landscape banner for "${artistName}"`);
            }
          }
        }
      } catch (e) {}

      // B. Priority 2: Wikipedia REST API (High-Resolution Original Image + Biography)
      if (!photoUrl || !description) {
        try {
          const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artistName)}`;
          const wikiRes = await fetch(wikiUrl, {
            headers: { "User-Agent": "Myusic/1.0 ( desktop music player )" }
          });
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json();
            if (!description && wikiData.extract) {
              description = wikiData.extract;
              console.log(`[Artist Metadata] 📖 Found Wikipedia biography for "${artistName}"`);
            }
            if (!photoUrl && (wikiData.originalimage?.source || wikiData.thumbnail?.source)) {
              photoUrl = wikiData.originalimage?.source || wikiData.thumbnail?.source;
              console.log(`[Artist Metadata] 🖼️  Found Wikipedia high-res image for "${artistName}"`);
            }
          }
        } catch (e) {}
      }

      // C. Priority 3: Deezer 1000px Studio Photo Fallback
      if (!photoUrl) {
        try {
          const deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`;
          const deezerRes = await fetch(deezerUrl);
          if (deezerRes.ok) {
            const deezerData = await deezerRes.json();
            const artist = deezerData?.data?.[0];
            if (artist && (artist.picture_xl || artist.picture_big)) {
              photoUrl = artist.picture_xl || artist.picture_big;
              console.log(`[Artist Metadata] 🖼️  Found Deezer 1000px image for "${artistName}"`);
            }
          }
        } catch (e) {}
      }

      // Download and cache the wide banner locally
      let localArtworkUrl = null;
      if (photoUrl) {
        const artistSlug = Buffer.from(artistName).toString("base64").replace(/[/+=]/g, "").slice(0, 20);
        const fileName = `artist_banner_${artistSlug}.jpg`;
        const diskPath = path.join(this.artworkCacheDir, fileName);

        if (!fs.existsSync(diskPath)) {
          console.log(`[Artist Metadata] 📥 Downloading wide banner image...`);
          const imgRes = await fetch(photoUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(diskPath, buffer);
            console.log(`[Artist Metadata] ✅ Saved wide banner to cache: ${fileName} (${Math.round(buffer.length / 1024)} KB)`);
          }
        } else {
          console.log(`[Artist Metadata] ⚡ Already cached locally: ${fileName}`);
        }
        localArtworkUrl = `atom://artwork/${fileName}`;
      }

      return {
        artworkUrl: localArtworkUrl,
        description
      };
    } catch (err) {
      console.warn(`[Artist Metadata] ⚠️ Failed lookup for ${artistName}:`, err.message);
      return null;
    }
  }

  // 5. Fetch Synced / Unsynced Lyrics (LRCLIB API)
  async fetchLyrics(song) {
    try {
      const lrcPath = song.filePath.replace(path.extname(song.filePath), ".lrc");
      if (fs.existsSync(lrcPath)) {
        console.log(`[Lyrics] 📄 Found local .lrc file on disk for "${song.title}"`);
        const lrcContent = fs.readFileSync(lrcPath, "utf-8");
        return this.parseLrc(lrcContent);
      }

      console.log(`[Lyrics] 🔍 Searching online lyrics for: "${song.artist}" — "${song.title}"...`);
      const artist = encodeURIComponent(song.artist);
      const title = encodeURIComponent(song.title);
      const album = encodeURIComponent(song.album || "");
      const duration = Math.round(song.duration || 0);

      const url = `https://lrclib.net/api/get?artist_name=${artist}&track_name=${title}&album_name=${album}&duration=${duration}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Myusic/1.0 ( desktop music player )" }
      });

      if (!res.ok) {
        const searchUrl = `https://lrclib.net/api/search?artist_name=${artist}&track_name=${title}`;
        const searchRes = await fetch(searchUrl, { headers: { "User-Agent": "Myusic/1.0" } });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData && searchData.length > 0) {
            const first = searchData[0];
            if (first.syncedLyrics) {
              console.log(`[Lyrics] ✨ Found Synced Lyrics (.lrc) for "${song.title}"!`);
              return this.parseLrc(first.syncedLyrics);
            }
            if (first.plainLyrics) {
              console.log(`[Lyrics] 📝 Found Plain Lyrics for "${song.title}".`);
              return this.parsePlainText(first.plainLyrics);
            }
          }
        }
        console.log(`[Lyrics] ℹ️  No online lyrics found for "${song.title}".`);
        return null;
      }

      const data = await res.json();
      if (data.syncedLyrics) {
        console.log(`[Lyrics] ✨ Found Synced Lyrics (.lrc) for "${song.title}"!`);
        return this.parseLrc(data.syncedLyrics);
      } else if (data.plainLyrics) {
        console.log(`[Lyrics] 📝 Found Plain Lyrics for "${song.title}".`);
        return this.parsePlainText(data.plainLyrics);
      }

      return null;
    } catch (err) {
      console.log(`[Lyrics] ⚠️ Could not fetch lyrics for "${song.title}":`, err.message);
      return null;
    }
  }

  parseLrc(lrcString) {
    const lines = [];
    const rawLines = lrcString.split("\n");
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const raw of rawLines) {
      const match = raw.match(timeRegex);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = parseFloat("0." + match[3]);
        const totalSeconds = min * 60 + sec + ms;
        const text = raw.replace(timeRegex, "").trim();

        if (text.length > 0) {
          lines.push({ time: totalSeconds, text });
        }
      }
    }

    if (lines.length > 0) {
      return { isSynced: true, lines };
    }
    return this.parsePlainText(lrcString);
  }

  parsePlainText(plainString) {
    const rawLines = plainString.split("\n").map(l => l.trim()).filter(Boolean);
    const lines = rawLines.map(text => ({ time: -1, text }));
    return { isSynced: false, lines };
  }

  async resolveAlbum(artist, album) {
    const staticData = await this.fetchStaticMetadata(artist, album);
    const animatedUrl = await this.fetchAnimatedArtwork(artist, album);
    const description = await this.fetchAlbumDescription(artist, album);

    return {
      artworkUrl: staticData?.artworkUrl || null,
      animatedArtworkUrl: animatedUrl || null,
      year: staticData?.year,
      genre: staticData?.genre,
      description: description || null
    };
  }
}

module.exports = { MetadataService };