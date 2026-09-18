const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.privacy.com.de"
];

async function fetchWithFallback(endpoint) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}${endpoint}`, {
        headers: { "User-Agent": "Myusic/1.0" }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Try next public instance
    }
  }
  throw new Error("All public Piped streaming instances are currently unavailable.");
}

// Search online tracks filtered by music
async function searchOnlineTracks(query) {
  try {
    if (!query || !query.trim()) return [];

    console.log(`[Myusic Online] ☁️ Searching catalog for: "${query}"...`);
    const data = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
    const items = data.items || data || [];

    const tracks = items
      .filter((item) => item.type === "stream" || item.url)
      .map((item) => {
        const videoId = item.url ? item.url.replace("/watch?v=", "") : item.id;
        return {
          id: `pipe_${videoId}`,
          title: item.title || "Unknown Title",
          artist: item.uploaderName || item.uploader || "Unknown Artist",
          album: "Myusic Cloud",
          duration: item.duration || 210,
          artworkUrl: item.thumbnail || "",
          source: "streaming",
          streamUrl: "" // Resolved lazily on playback
        };
      });

    console.log(`[Myusic Online] ✅ Found ${tracks.length} full songs.`);
    return tracks;
  } catch (err) {
    console.error("[Myusic Online] ❌ Search error:", err);
    return [];
  }
}

// Resolve direct audio stream URL on-demand when user clicks play
async function getAudioStreamUrl(videoId) {
  try {
    const cleanId = videoId.replace("pipe_", "").replace("yt_", "");
    console.log(`[Myusic Online] 🎧 Resolving full audio stream for ID: ${cleanId}...`);

    const data = await fetchWithFallback(`/streams/${cleanId}`);
    const audioStreams = data.audioStreams || [];
    
    // Choose best audio-only format (m4a or webm)
    const bestAudio = audioStreams.find(s => s.mimeType?.includes("audio/mp4") || s.mimeType?.includes("audio/webm")) || audioStreams[0];

    if (!bestAudio || !bestAudio.url) {
      throw new Error("No playable audio stream found.");
    }

    console.log(`[Myusic Online] ✅ Audio stream resolved successfully.`);
    return bestAudio.url;
  } catch (err) {
    console.error("[Myusic Online] ❌ Stream resolution error:", err);
    return null;
  }
}

module.exports = { searchOnlineTracks, getAudioStreamUrl };