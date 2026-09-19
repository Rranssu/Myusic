export type NavigationTab = 'search' | 'home' | 'songs' | 'albums' | 'artists' | 'playlists' | 'settings' | 'statistics';

export interface PlaybackStats {
  songPlayCounts: Record<string, number>;
  artistPlayCounts: Record<string, number>;
  albumPlayCounts: Record<string, number>;
  totalPlays: number;
  lastPlayedSongId?: string;
  dailyHistory?: Record<string, number>; // "YYYY-MM-DD" -> count
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface LyricsData {
  isSynced: boolean;
  lines: LyricLine[];
}

export interface Song {
  id: string;
  filePath: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  trackNumber?: number;
  year?: number;
  artworkUrl?: string;
  animatedArtworkUrl?: string;
  lyrics?: LyricsData;
  isExternal?: boolean;
  previewUrl?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year?: number;
  genre?: string;
  description?: string;
  songCount: number;
  artworkUrl?: string;
  animatedArtworkUrl?: string;
  songs?: Song[];
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  artworkUrl?: string;
  description?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
  coverColor?: string;
  createdAt: number;
}

export interface LibraryData {
  folder?: string;
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  lastScanned: number;
}

export interface PlaybackStats {
  songPlayCounts: Record<string, number>;
  artistPlayCounts: Record<string, number>;
  albumPlayCounts: Record<string, number>;
  totalPlays: number;
  lastPlayedSongId?: string;
}

export interface RecommendedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
  isExternal: true;
}

export interface SimilarArtist {
  id: string;
  name: string;
  artworkUrl: string;
  inLibrary: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      selectAndScanFolder: () => Promise<LibraryData | null>;
      getLibrary: () => Promise<LibraryData>;
      getLyrics: (song: Song) => Promise<LyricsData | null>;

      // Window Controls
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isWindowMaximized: () => Promise<boolean>;
      toggleFullScreen: () => Promise<boolean>;
      isFullScreen: () => Promise<boolean>;

      // Downloader Methods
      fetchStaticMetadata: () => Promise<LibraryData | null>;
      fetchAnimatedMetadata: () => Promise<LibraryData | null>;
      fetchArtistMetadata: () => Promise<LibraryData | null>;
      fetchLyricsMetadata: () => Promise<{ success: boolean; count: number } | null>;
      fetchForAlbum: (artist: string, album: string) => Promise<LibraryData | null>;

      // Playlists
      getPlaylists: () => Promise<Playlist[]>;
      savePlaylist: (playlist: Playlist) => Promise<Playlist[]>;
      deletePlaylist: (playlistId: string) => Promise<Playlist[]>;

      // System
      showItemInFolder: (fullPath: string) => Promise<boolean>;

      // Phase 6 Analytics & Recommendations
      recordPlay: (song: Song) => Promise<void>;
      getStats: () => Promise<PlaybackStats>;
      getSimilarArtists: (artistName: string) => Promise<SimilarArtist[]>;
      getDiscoverTracks: (artistName: string) => Promise<RecommendedTrack[]>;
    };
  }
}