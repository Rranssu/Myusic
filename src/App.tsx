import { useState, useEffect } from 'react';

// Modular Apple Music Styling
import './styles/variables.css';
import './styles/layout.css';
import './styles/sidebar.css';
import './styles/pill-player.css';
import './styles/now-playing.css';
import './styles/detail-views.css';
import './styles/playlists.css';
import './styles/context-menu.css';

import type { NavigationTab, LibraryData, Album, Artist, Playlist, Song } from './types/music';
import { extractPaletteFromImage, type Palette } from './utils/colorExtractor';
import { Sidebar } from './components/layout/Sidebar';
import { NowPlayingBar } from './components/layout/NowPlayingBar';
import { NowPlayingScreen } from './components/player/NowPlayingScreen';
import { HomePage } from './pages/HomePage';
import { SongsPage } from './pages/SongsPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { AlbumDetailPage } from './pages/AlbumDetailPage';
import { ArtistDetailPage } from './pages/ArtistDetailPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { NewPlaylistModal } from './components/modals/NewPlaylistModal';
import { TrackDetailsModal } from './components/modals/TrackDetailsModal';
import { TrackContextMenu } from './components/menus/TrackContextMenu';
import { SearchIcon } from './components/icons/Icons';
import { useAudioPlayer } from './hooks/useAudioPlayer';

const DEFAULT_PALETTE: Palette = {
  primary: "rgb(250, 45, 72)",
  secondary: "rgb(110, 60, 230)",
  accent: "#fa2d48",
  glowPrimary: "rgba(250, 45, 72, 0.45)",
  glowSecondary: "rgba(110, 60, 230, 0.35)"
};

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isNewPlaylistModalOpen, setIsNewPlaylistModalOpen] = useState<boolean>(false);

  // App-Wide Theme Palette
  const [appPalette, setAppPalette] = useState<Palette>(DEFAULT_PALETTE);

  // Context Menu & Details Modal State
  const [contextMenu, setContextMenu] = useState<{ song: Song; position: { x: number; y: number } } | null>(null);
  const [detailsSong, setDetailsSong] = useState<Song | null>(null);

  // Downloader loading states
  const [isFetchingStatic, setIsFetchingStatic] = useState<boolean>(false);
  const [isFetchingAnimated, setIsFetchingAnimated] = useState<boolean>(false);
  const [isFetchingArtist, setIsFetchingArtist] = useState<boolean>(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState<boolean>(false);

  // Selected Album / Artist / Playlist
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const [library, setLibrary] = useState<LibraryData>({
    songs: [],
    albums: [],
    artists: [],
    lastScanned: 0
  });

  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // Audio Engine Hook (Single Source of Truth)
  const player = useAudioPlayer();

  // Load offline library and playlists on startup
  useEffect(() => {
    if (window.electronAPI?.getLibrary) {
      window.electronAPI.getLibrary().then((cached) => {
        if (cached && cached.songs) setLibrary(cached);
      });
    }

    if (window.electronAPI?.getPlaylists) {
      window.electronAPI.getPlaylists().then((saved) => {
        if (saved) setPlaylists(saved);
      });
    }
  }, []);

  // Sync active playing song with latest library metadata
  const activeSong =
    library.songs.find(
      (s) => (player.currentSong?.filePath && s.filePath === player.currentSong.filePath) || s.id === player.currentSong?.id
    ) || player.currentSong;

  // =======================================================
  // CENTRALIZED THEME & LIVING AURA HIERARCHY
  // 1. Album Detail (highest priority)
  // 2. Artist Detail
  // 3. Currently Playing Track
  // 4. Default Theme
  // =======================================================
  const activeThemeSource =
    selectedAlbum?.artworkUrl ||
    selectedArtist?.artworkUrl ||
    activeSong?.artworkUrl ||
    null;

  useEffect(() => {
    if (activeThemeSource) {
      extractPaletteFromImage(activeThemeSource).then((p) => {
        setAppPalette(p);

        // Morph full window background
        document.documentElement.style.setProperty(
          '--bg-app',
          `radial-gradient(circle at 18% 22%, ${p.glowPrimary} 0%, transparent 60%),
           radial-gradient(circle at 82% 78%, ${p.glowSecondary} 0%, transparent 60%),
           rgba(10, 10, 14, 0.72)`
        );

        // Tint sidebar with secondary hue
        document.documentElement.style.setProperty(
          '--bg-sidebar',
          `linear-gradient(180deg, ${p.glowSecondary.replace(/[\d.]+\)$/, '0.22)')} 0%, rgba(8, 8, 12, 0.65) 100%)`
        );

        // Adapt active accents
        document.documentElement.style.setProperty('--accent-primary', p.accent);
        document.documentElement.style.setProperty('--accent-glow', p.glowPrimary);
      });
    } else {
      // Revert to Default Theme
      setAppPalette(DEFAULT_PALETTE);
      document.documentElement.style.removeProperty('--bg-app');
      document.documentElement.style.removeProperty('--bg-sidebar');
      document.documentElement.style.removeProperty('--accent-primary');
      document.documentElement.style.removeProperty('--accent-glow');
    }
  }, [activeThemeSource]);

  // 0. Native Folder Scan
  const handleScanFolder = async () => {
    if (!window.electronAPI?.selectAndScanFolder) return;
    try {
      setIsScanning(true);
      const data = await window.electronAPI.selectAndScanFolder();
      if (data) {
        setLibrary(data);
        setCurrentTab('songs');
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // 1. Static Metadata & Covers
  const handleFetchStatic = async () => {
    if (!window.electronAPI?.fetchStaticMetadata) return;
    try {
      setIsFetchingStatic(true);
      const updatedLib = await window.electronAPI.fetchStaticMetadata();
      if (updatedLib) setLibrary(updatedLib);
    } catch (err) {
      console.error("Static metadata error:", err);
    } finally {
      setIsFetchingStatic(false);
    }
  };

  // 2. Animated Artwork
  const handleFetchAnimated = async () => {
    if (!window.electronAPI?.fetchAnimatedMetadata) return;
    try {
      setIsFetchingAnimated(true);
      const updatedLib = await window.electronAPI.fetchAnimatedMetadata();
      if (updatedLib) setLibrary(updatedLib);
    } catch (err) {
      console.error("Animated artwork error:", err);
    } finally {
      setIsFetchingAnimated(false);
    }
  };

  // 3. Artist Portraits & Biographies
  const handleFetchArtist = async () => {
    if (!window.electronAPI?.fetchArtistMetadata) return;
    try {
      setIsFetchingArtist(true);
      const updatedLib = await window.electronAPI.fetchArtistMetadata();
      if (updatedLib) setLibrary(updatedLib);
    } catch (err) {
      console.error("Artist metadata error:", err);
    } finally {
      setIsFetchingArtist(false);
    }
  };

  // 4. Batch Lyrics Downloader
  const handleFetchLyrics = async () => {
    if (!window.electronAPI?.fetchLyricsMetadata) return;
    try {
      setIsFetchingLyrics(true);
      await window.electronAPI.fetchLyricsMetadata();
    } catch (err) {
      console.error("Lyrics download error:", err);
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  const handleCreatePlaylist = async (newPl: Playlist) => {
    if (window.electronAPI?.savePlaylist) {
      const updated = await window.electronAPI.savePlaylist(newPl);
      setPlaylists(updated);
      setSelectedPlaylist(newPl);
    }
  };

  const handleUpdatePlaylist = async (updatedPl: Playlist) => {
    if (window.electronAPI?.savePlaylist) {
      const updated = await window.electronAPI.savePlaylist(updatedPl);
      setPlaylists(updated);
      setSelectedPlaylist(updatedPl);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (window.electronAPI?.deletePlaylist) {
      const updated = await window.electronAPI.deletePlaylist(id);
      setPlaylists(updated);
      setSelectedPlaylist(null);
    }
  };

  const handleAddSongToPlaylist = async (playlistId: string, songId: string) => {
    const target = playlists.find((p) => p.id === playlistId);
    if (!target || target.songIds.includes(songId)) return;
    const updatedPl: Playlist = { ...target, songIds: [...target.songIds, songId] };
    handleUpdatePlaylist(updatedPl);
  };

  const handleSelectTab = (tab: NavigationTab) => {
    setSelectedAlbum(null);
    setSelectedArtist(null);
    setSelectedPlaylist(null);
    setCurrentTab(tab);
  };

  const handleOpenAlbum = (album: Album) => {
    setSelectedArtist(null);
    setSelectedPlaylist(null);
    setSelectedAlbum(album);
  };

  const handleOpenArtist = (artistName: string) => {
    setSelectedAlbum(null);
    setSelectedPlaylist(null);
    const found = library.artists.find(
      (a) => a.name.toLowerCase() === artistName.toLowerCase()
    );
    if (found) {
      setSelectedArtist(found);
    } else {
      setSelectedArtist({ id: artistName, name: artistName, albumCount: 1, songCount: 1 });
    }
  };

  const handleOpenPlaylist = (playlist: Playlist) => {
    setSelectedAlbum(null);
    setSelectedArtist(null);
    setSelectedPlaylist(playlist);
  };

  const handleOpenTrackMenu = (e: React.MouseEvent, song: Song) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      song,
      position: { x: rect.right - 220, y: rect.bottom + 6 }
    });
  };

  return (
    <div className="app-container">
      {/* Dynamic Global Background Aurora Mesh */}
      {activeThemeSource && (
        <div className="global-aurora-container">
          <div
            className="global-aurora-orb orb-1"
            style={{ background: `radial-gradient(circle, ${appPalette.glowPrimary} 0%, transparent 65%)` }}
          />
          <div
            className="global-aurora-orb orb-2"
            style={{ background: `radial-gradient(circle, ${appPalette.glowSecondary} 0%, transparent 65%)` }}
          />
          <div
            className="global-aurora-orb orb-3"
            style={{ background: `radial-gradient(circle, ${appPalette.glowPrimary} 0%, transparent 65%)` }}
          />
        </div>
      )}

      {/* Dynamic Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isCompact={isCompact}
        onToggleCompact={() => setIsCompact(!isCompact)}
        playlists={playlists}
        onSelectPlaylist={handleOpenPlaylist}
        onOpenNewPlaylistModal={() => setIsNewPlaylistModalOpen(true)}
      />

      <main className="app-viewport">
        <div className="app-content">
          {selectedPlaylist ? (
            <PlaylistDetailPage
              playlist={selectedPlaylist}
              allSongs={library.songs}
              onBack={() => setSelectedPlaylist(null)}
              onPlaySong={(song, list) => player.playSong(song, list)}
              onUpdatePlaylist={handleUpdatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
            />
          ) : selectedAlbum ? (
            <AlbumDetailPage
              album={selectedAlbum}
              allSongs={library.songs}
              onBack={() => setSelectedAlbum(null)}
              onPlaySong={(song, list) => {
                const albumSongs = list || library.songs.filter(
                  (s) => s.album.toLowerCase() === selectedAlbum.title.toLowerCase()
                );
                player.playSong(song, albumSongs);
              }}
              onSelectArtist={handleOpenArtist}
            />
          ) : selectedArtist ? (
            <ArtistDetailPage
              artist={selectedArtist}
              allSongs={library.songs}
              allAlbums={library.albums}
              onBack={() => setSelectedArtist(null)}
              onPlaySong={(song, list) => {
                const artistSongs = list || library.songs.filter(
                  (s) => s.artist.toLowerCase() === selectedArtist.name.toLowerCase()
                );
                player.playSong(song, artistSongs);
              }}
              onSelectAlbum={handleOpenAlbum}
            />
          ) : (
            <>
              {currentTab === 'search' && (
                <div className="search-page">
                  <h2 className="section-title">Search</h2>
                  <div className="search-input-large-wrapper">
                    <SearchIcon size={20} color="var(--text-secondary)" />
                    <input type="text" placeholder="Artists, Songs, Lyrics, and more" autoFocus />
                  </div>
                </div>
              )}

              {currentTab === 'home' && (
                <HomePage
                  library={library}
                  onScanFolderClick={handleScanFolder}
                  onSelectAlbum={handleOpenAlbum}
                  onPlaySong={(song) => player.playSong(song, library.songs)}
                />
              )}

              {currentTab === 'songs' && (
                <SongsPage
                  songs={library.songs}
                  onPlaySong={(song) => player.playSong(song, library.songs)}
                  onOpenTrackMenu={handleOpenTrackMenu}
                />
              )}

              {currentTab === 'albums' && (
                <AlbumsPage
                  albums={library.albums}
                  onSelectAlbum={handleOpenAlbum}
                />
              )}

              {currentTab === 'artists' && (
                <ArtistsPage
                  artists={library.artists}
                  onSelectArtist={(artist) => setSelectedArtist(artist)}
                />
              )}

              {currentTab === 'playlists' && (
                <PlaylistsPage
                  playlists={playlists}
                  allSongs={library.songs}
                  onSelectPlaylist={handleOpenPlaylist}
                  onOpenNewModal={() => setIsNewPlaylistModalOpen(true)}
                />
              )}

              {currentTab === 'settings' && (
                <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '820px' }}>
                  <h2 className="section-title">Settings</h2>

                  <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Local Music Library</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      {library.songs.length} tracks indexed from local disk storage.
                    </p>
                    <button className="btn-primary" onClick={handleScanFolder} disabled={isScanning} type="button">
                      {isScanning ? 'Scanning Directory...' : 'Scan / Change Folder'}
                    </button>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Static Album Metadata & Covers</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Download uncompressed 1000px cover artwork from iTunes, release year, genre, and Wikipedia album summaries.
                    </p>
                    <button className="btn-secondary" onClick={handleFetchStatic} disabled={isFetchingStatic} type="button">
                      {isFetchingStatic ? 'Downloading Static Covers...' : 'Fetch Static Metadata & Covers'}
                    </button>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Animated Album Covers</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Check Apple Music for official seamless looping video covers (.mp4) and assemble them directly into your offline cache.
                    </p>
                    <button className="btn-secondary" onClick={handleFetchAnimated} disabled={isFetchingAnimated} type="button">
                      {isFetchingAnimated ? 'Assembling Animated Loops...' : 'Fetch Animated Video Covers'}
                    </button>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Artist Portraits & Biographies</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Fetch high-resolution studio portraits from Deezer/Wikipedia and encyclopedic artist biographies into local storage.
                    </p>
                    <button className="btn-secondary" onClick={handleFetchArtist} disabled={isFetchingArtist} type="button">
                      {isFetchingArtist ? 'Fetching Artist Data...' : 'Fetch Artist Portraits & Bios'}
                    </button>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Synchronized & Plain Lyrics</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Batch download timestamped (.lrc) and plain text lyrics from LRCLIB for offline viewing and live karaoke seeking.
                    </p>
                    <button className="btn-secondary" onClick={handleFetchLyrics} disabled={isFetchingLyrics} type="button">
                      {isFetchingLyrics ? 'Batch Downloading Lyrics...' : 'Fetch Song Lyrics'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating Apple Music Pill Dock */}
        <NowPlayingBar
          currentSong={activeSong}
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          volume={player.volume}
          isShuffle={player.isShuffle}
          repeatMode={player.repeatMode}
          onTogglePlay={player.togglePlayPause}
          onNext={player.handleNext}
          onPrev={player.handlePrev}
          onSeek={player.seek}
          onVolumeChange={player.setVolume}
          onToggleShuffle={player.toggleShuffle}
          onToggleRepeat={player.toggleRepeat}
          onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
        />
      </main>

      {/* Fullscreen Now Playing Overlay */}
      <NowPlayingScreen
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        currentSong={activeSong}
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={player.duration}
        volume={player.volume}
        queue={player.queue}
        queueIndex={player.queueIndex}
        onPlaySong={player.playSong}
        onTogglePlay={player.togglePlayPause}
        onNext={player.handleNext}
        onPrev={player.handlePrev}
        onSeek={player.seek}
        onVolumeChange={player.setVolume}
      />

      {/* New Playlist Modal */}
      <NewPlaylistModal
        isOpen={isNewPlaylistModalOpen}
        onClose={() => setIsNewPlaylistModalOpen(false)}
        onCreate={handleCreatePlaylist}
      />

      {/* Track Details (Get Info) Modal */}
      <TrackDetailsModal
        song={detailsSong}
        isOpen={Boolean(detailsSong)}
        onClose={() => setDetailsSong(null)}
      />

      {/* Floating 3-Dot Track Context Menu */}
      {contextMenu && (
        <TrackContextMenu
          song={contextMenu.song}
          position={contextMenu.position}
          playlists={playlists}
          onClose={() => setContextMenu(null)}
          onPlayNext={player.playNext}
          onAddToQueue={player.addToQueue}
          onAddToPlaylist={handleAddSongToPlaylist}
          onGoToAlbum={(albumTitle) => {
            const found = library.albums.find(a => a.title.toLowerCase() === albumTitle.toLowerCase());
            if (found) handleOpenAlbum(found);
          }}
          onGoToArtist={handleOpenArtist}
          onFetchMetadata={(song) => {
            window.electronAPI?.fetchForAlbum?.(song.artist, song.album).then((updated: LibraryData | null) => {
              if (updated) setLibrary(updated);
            });
          }}
          onFetchAnimated={(song) => {
            window.electronAPI?.fetchForAlbum?.(song.artist, song.album).then((updated: LibraryData | null) => {
              if (updated) setLibrary(updated);
            });
          }}
          onShowDetails={(song) => setDetailsSong(song)}
        />
      )}
    </div>
  );
}

export default App;