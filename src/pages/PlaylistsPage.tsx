import React from 'react';
import type { Playlist, Song } from '../types/music';
import { PlusIcon, PlaylistIcon } from '../components/icons/Icons';

interface PlaylistsPageProps {
  playlists: Playlist[];
  allSongs: Song[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenNewModal: () => void;
}

export function PlaylistsPage({
  playlists,
  allSongs,
  onSelectPlaylist,
  onOpenNewModal
}: PlaylistsPageProps) {
  // Helper to get first available artwork from songs in playlist
  const getPlaylistCoverArt = (pl: Playlist): string | null => {
    if (!pl.songIds || pl.songIds.length === 0) return null;
    const firstSong = allSongs.find((s) => pl.songIds.includes(s.id) && s.artworkUrl);
    return firstSong?.artworkUrl || null;
  };

  return (
    <div className="playlists-page">
      <div className="section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="section-title">Playlists</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
          </p>
        </div>

        <button className="btn-primary" onClick={onOpenNewModal} type="button">
          <PlusIcon size={16} color="#ffffff" />
          <span>New Playlist</span>
        </button>
      </div>

      <div className="grid-cards">
        {/* Create Card Shortcut */}
        <div className="music-card create-playlist-card" onClick={onOpenNewModal}>
          <div className="music-card-artwork create-playlist-artwork">
            <PlusIcon size={42} color="var(--accent-primary)" />
          </div>
          <div className="music-card-info">
            <h4>Create Playlist</h4>
            <p>Add songs from library</p>
          </div>
        </div>

        {/* Existing Playlists */}
        {playlists.map((pl) => {
          const coverArt = getPlaylistCoverArt(pl);
          return (
            <div
              key={pl.id}
              className="music-card"
              onClick={() => onSelectPlaylist(pl)}
            >
              <div
                className="music-card-artwork playlist-grid-art"
                style={{ backgroundColor: pl.coverColor || "#353542" }}
              >
                {coverArt ? (
                  <img src={coverArt} alt={pl.name} />
                ) : (
                  <span className="playlist-art-letter">{pl.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="music-card-info">
                <h4>{pl.name}</h4>
                <p>{pl.songIds?.length || 0} {pl.songIds?.length === 1 ? 'track' : 'tracks'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlaylistsPage;