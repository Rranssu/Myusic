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
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useAppTheme } from './hooks/useAppTheme';

// Layout & Modals
import { Sidebar } from './components/layout/Sidebar';
import { GlobalAurora } from './components/layout/GlobalAurora';
import { NowPlayingBar } from './components/layout/NowPlayingBar';
import { NowPlayingScreen } from './components/player/NowPlayingScreen';
import { NewPlaylistModal } from './components/modals/NewPlaylistModal';
import { TrackDetailsModal } from './components/modals/TrackDetailsModal';
import { TrackContextMenu } from './components/menus/TrackContextMenu';

// Pages
import { HomePage } from './pages/HomePage';
import { SongsPage } from './pages/SongsPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { AlbumDetailPage } from './pages/AlbumDetailPage';
import { ArtistDetailPage } from './pages/ArtistDetailPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [isCompact, setIsCompact] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isNewPlaylistModalOpen, setIsNewPlaylistModalOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ song: Song; position: { x: number; y: number } } | null>(null);
  const [detailsSong, setDetailsSong] = useState<Song | null>(null);

  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const [library, setLibrary] = useState<LibraryData>({ songs: [], albums: [], artists: [], lastScanned: 0 });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const player = useAudioPlayer();

  useEffect(() => {
    window.electronAPI?.getLibrary?.().then((cached) => cached?.songs && setLibrary(cached));
    window.electronAPI?.getPlaylists?.().then((saved) => saved && setPlaylists(saved));
  }, []);

  // Inherit animated artwork from parent album if present
  const matchedSong = library.songs.find((s) => (player.currentSong?.filePath && s.filePath === player.currentSong.filePath) || s.id === player.currentSong?.id) || player.currentSong;
  const matchedAlbum = library.albums.find((a) => a.title.toLowerCase() === matchedSong?.album?.toLowerCase());
  const activeSong = matchedSong ? { ...matchedSong, animatedArtworkUrl: matchedSong.animatedArtworkUrl || matchedAlbum?.animatedArtworkUrl } : null;

  // Global Dynamic Theme Hook
  const { appPalette, activeThemeSource } = useAppTheme({ selectedAlbum, selectedArtist, activeSong });

  // Unique key identifying the active view (triggers page transition animation on change)
  const currentViewKey = selectedPlaylist
    ? `playlist-${selectedPlaylist.id}`
    : selectedAlbum
    ? `album-${selectedAlbum.id}`
    : selectedArtist
    ? `artist-${selectedArtist.name}`
    : `tab-${currentTab}`;

  // Reset scroll position to top whenever switching pages
  useEffect(() => {
    const contentEl = document.querySelector('.app-content');
    if (contentEl) contentEl.scrollTop = 0;
  }, [currentViewKey]);

  // Navigation handlers
  const handleSelectTab = (tab: NavigationTab) => { setSelectedAlbum(null); setSelectedArtist(null); setSelectedPlaylist(null); setCurrentTab(tab); };
  const handleOpenAlbum = (album: Album) => { setSelectedArtist(null); setSelectedPlaylist(null); setSelectedAlbum(album); };
  const handleOpenArtist = (name: string) => {
    setSelectedAlbum(null); setSelectedPlaylist(null);
    const found = library.artists.find((a) => a.name.toLowerCase() === name.toLowerCase());
    setSelectedArtist(found || { id: name, name, albumCount: 1, songCount: 1 });
  };
  const handleOpenPlaylist = (pl: Playlist) => { setSelectedAlbum(null); setSelectedArtist(null); setSelectedPlaylist(pl); };

  // Playlist actions
  const handleSavePlaylist = async (pl: Playlist) => {
    const updated = await window.electronAPI?.savePlaylist?.(pl);
    if (updated) { setPlaylists(updated); setSelectedPlaylist(pl); }
  };
  const handleDeletePlaylist = async (id: string) => {
    const updated = await window.electronAPI?.deletePlaylist?.(id);
    if (updated) { setPlaylists(updated); setSelectedPlaylist(null); }
  };

  const handleScanFolder = async () => {
    try {
      setIsScanning(true);
      const data = await window.electronAPI?.selectAndScanFolder?.();
      if (data) { setLibrary(data); setCurrentTab('songs'); }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="app-container">
      <GlobalAurora activeThemeSource={activeThemeSource} palette={appPalette} />

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
          {/* Animated Page Transition Container */}
          <div key={currentViewKey} className="page-transition-container">
            {selectedPlaylist ? (
              <PlaylistDetailPage
                playlist={selectedPlaylist}
                allSongs={library.songs}
                onBack={() => setSelectedPlaylist(null)}
                onPlaySong={(song, list) => player.playSong(song, list)}
                onUpdatePlaylist={handleSavePlaylist}
                onDeletePlaylist={handleDeletePlaylist}
              />
            ) : selectedAlbum ? (
              <AlbumDetailPage
                album={selectedAlbum}
                allSongs={library.songs}
                onBack={() => setSelectedAlbum(null)}
                onPlaySong={(song, list) => player.playSong(song, list || library.songs.filter(s => s.album.toLowerCase() === selectedAlbum.title.toLowerCase()))}
                onSelectArtist={handleOpenArtist}
              />
            ) : selectedArtist ? (
              <ArtistDetailPage
                artist={selectedArtist}
                allSongs={library.songs}
                allAlbums={library.albums}
                onBack={() => setSelectedArtist(null)}
                onPlaySong={(song, list) => player.playSong(song, list || library.songs.filter(s => s.artist.toLowerCase() === selectedArtist.name.toLowerCase()))}
                onSelectAlbum={handleOpenAlbum}
              />
            ) : (
              <>
                {currentTab === 'search' && <SearchPage />}
                {currentTab === 'home' && (
                <HomePage
                  library={library}
                  onScanFolderClick={handleScanFolder}
                  onSelectAlbum={handleOpenAlbum}
                  onPlaySong={(song, list) => player.playSong(song, list || library.songs)}
                />
              )}
                {currentTab === 'songs' && <SongsPage songs={library.songs} onPlaySong={(song) => player.playSong(song, library.songs)} onOpenTrackMenu={(e, song) => setContextMenu({ song, position: { x: e.currentTarget.getBoundingClientRect().right - 220, y: e.currentTarget.getBoundingClientRect().bottom + 6 } })} />}
                {currentTab === 'albums' && <AlbumsPage albums={library.albums} onSelectAlbum={handleOpenAlbum} />}
                {currentTab === 'artists' && <ArtistsPage artists={library.artists} onSelectArtist={setSelectedArtist} />}
                {currentTab === 'playlists' && <PlaylistsPage playlists={playlists} allSongs={library.songs} onSelectPlaylist={handleOpenPlaylist} onOpenNewModal={() => setIsNewPlaylistModalOpen(true)} />}
                {currentTab === 'settings' && (
                  <SettingsPage
                    library={library}
                    isScanning={isScanning}
                    onScanFolder={handleScanFolder}
                    onLibraryUpdated={setLibrary}
                    crossfadeDuration={player.crossfadeDuration}
                    onCrossfadeChange={player.setCrossfadeDuration}
                  />
                )}
              </>
            )}
          </div>
        </div>

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

      <NewPlaylistModal
        isOpen={isNewPlaylistModalOpen}
        onClose={() => setIsNewPlaylistModalOpen(false)}
        onCreate={handleSavePlaylist}
      />

      <TrackDetailsModal
        song={detailsSong}
        isOpen={Boolean(detailsSong)}
        onClose={() => setDetailsSong(null)}
      />

      {contextMenu && (
        <TrackContextMenu
          song={contextMenu.song}
          position={contextMenu.position}
          playlists={playlists}
          onClose={() => setContextMenu(null)}
          onPlayNext={player.playNext}
          onAddToQueue={player.addToQueue}
          onAddToPlaylist={(plId, sId) => {
            const target = playlists.find(p => p.id === plId);
            if (target && !target.songIds.includes(sId)) handleSavePlaylist({ ...target, songIds: [...target.songIds, sId] });
          }}
          onGoToAlbum={(album) => { const f = library.albums.find(a => a.title.toLowerCase() === album.toLowerCase()); if (f) handleOpenAlbum(f); }}
          onGoToArtist={handleOpenArtist}
          onFetchMetadata={(s) => window.electronAPI?.fetchForAlbum?.(s.artist, s.album).then(u => u && setLibrary(u))}
          onFetchAnimated={(s) => window.electronAPI?.fetchForAlbum?.(s.artist, s.album).then(u => u && setLibrary(u))}
          onShowDetails={setDetailsSong}
        />
      )}
    </div>
  );
}

export default App;