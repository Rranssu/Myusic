class RecommendationService {
  // 1. Find Similar Artists
  async getSimilarArtists(artistName, libraryArtists = []) {
    try {
      if (!artistName || artistName.toLowerCase().includes("unknown")) {
        return [];
      }

      console.log(`[Recommendations] 🔍 Searching similar artists to "${artistName}"...`);
      const searchRes = await fetch(
        `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`
      );
      if (!searchRes.ok) return [];
      const searchData = await searchRes.json();
      const artistId = searchData?.data?.[0]?.id;
      if (!artistId) return [];

      const relatedRes = await fetch(
        `https://api.deezer.com/artist/${artistId}/related?limit=8`
      );
      if (!relatedRes.ok) return [];
      const relatedData = await relatedRes.json();

      if (!relatedData?.data || !Array.isArray(relatedData.data)) return [];

      const libraryArtistSet = new Set(
        libraryArtists.map((a) => a.name.toLowerCase())
      );

      return relatedData.data.map((item) => ({
        id: String(item.id),
        name: item.name,
        artworkUrl: item.picture_xl || item.picture_big || item.picture_medium,
        inLibrary: libraryArtistSet.has(item.name.toLowerCase())
      }));
    } catch (err) {
      console.warn(`[Recommendations] Error fetching similar artists:`, err.message);
      return [];
    }
  }

  // 2. Discover Out-of-Library Songs with 30s Audio Stream Previews
  async getDiscoverTracks(artistName, localSongTitles = []) {
    try {
      if (!artistName || artistName.toLowerCase().includes("unknown")) {
        return [];
      }

      console.log(`[Recommendations] 🎵 Fetching discovery tracks for "${artistName}" & similar artists...`);

      // Step A: Find Artist ID
      const searchRes = await fetch(
        `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`
      );
      if (!searchRes.ok) return [];
      const searchData = await searchRes.json();
      const artistId = searchData?.data?.[0]?.id;
      if (!artistId) return [];

      let allCandidates = [];

      // Step B: Query top tracks from the artist
      const topRes = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=10`);
      if (topRes.ok) {
        const topData = await topRes.json();
        if (topData?.data && Array.isArray(topData.data)) {
          allCandidates.push(...topData.data);
        }
      }

      // Step C: ALSO query tracks from 3 similar/related artists so the shelf is never empty!
      const relatedRes = await fetch(`https://api.deezer.com/artist/${artistId}/related?limit=3`);
      if (relatedRes.ok) {
        const relatedData = await relatedRes.json();
        if (relatedData?.data && Array.isArray(relatedData.data)) {
          for (const relArtist of relatedData.data) {
            const relTopRes = await fetch(`https://api.deezer.com/artist/${relArtist.id}/top?limit=4`);
            if (relTopRes.ok) {
              const relTopData = await relTopRes.json();
              if (relTopData?.data && Array.isArray(relTopData.data)) {
                allCandidates.push(...relTopData.data);
              }
            }
          }
        }
      }

      const localTitleSet = new Set(
        localSongTitles.map((t) => t.toLowerCase())
      );

      // Filter: Keep tracks user doesn't have that contain a valid 30s preview stream
      const seenIds = new Set();
      const discoveryTracks = [];

      for (const item of allCandidates) {
        if (!item.preview || seenIds.has(item.id) || localTitleSet.has(item.title.toLowerCase())) {
          continue;
        }

        seenIds.add(item.id);
        discoveryTracks.push({
          id: `ext_${item.id}`,
          title: item.title,
          artist: item.artist?.name || artistName,
          album: item.album?.title || "Single",
          artworkUrl: item.album?.cover_xl || item.album?.cover_medium,
          previewUrl: item.preview, // 30-second audio preview stream
          isExternal: true
        });

        if (discoveryTracks.length >= 8) break;
      }

      console.log(`[Recommendations] ✅ Successfully curated ${discoveryTracks.length} out-of-library tracks!`);
      return discoveryTracks;
    } catch (err) {
      console.warn(`[Recommendations] Error fetching discover tracks:`, err.message);
      return [];
    }
  }
}

module.exports = { RecommendationService };