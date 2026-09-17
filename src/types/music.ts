export type NavigationTab = 'search' | 'home' | 'songs' | 'albums' | 'artists' | 'playlists' | 'settings';

export interface LyricLine {
  time: number; // in seconds (-1 if unsynced)
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
  duration: number; // in seconds
  trackNumber?: number;
  year?: number;
  artworkUrl?: string;
  animatedArtworkUrl?: string;
  lyrics?: LyricsData;
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

// Global Electron API Definition for React
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
    };
  }
}