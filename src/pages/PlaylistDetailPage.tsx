import React, { useState } from 'react';
import type { Playlist, Song } from '../types/music';
import { ArrowLeftIcon, PlayIcon, ShuffleIcon, PlusIcon } from '../components/icons/Icons';

interface PlaylistDetailPageProps {
  playlist: Playlist;
  allSongs: Song[];
  onBack: () => void;
  onPlaySong?: (song: Song, playlistSongs?: Song[]) => void;
  onUpdatePlaylist: (updated: Playlist) => void;
  onDeletePlaylist: (playlistId: string) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function PlaylistDetailPage({
  playlist,
  allSongs,
  onBack,
  onPlaySong,
  onUpdatePlaylist,
  onDeletePlaylist
}: PlaylistDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(playlist.name);

  // Map songIds to Song objects in order
  const playlistSongs = (playlist.songIds || [])
    .map((id) => allSongs.find((s) => s.id === id))
    .filter((s): s is Song => Boolean(s));

  const totalSeconds = playlistSongs.reduce((acc, s) => acc + s.duration, 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  const handleSaveName = () => {
    if (editName.trim() && editName !== playlist.name) {
      onUpdatePlaylist({ ...playlist, name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleRemoveSong = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    const updatedIds = playlist.songIds.filter((id) => id !== songId);
    onUpdatePlaylist({ ...playlist, songIds: updatedIds });
  };

  const firstArtwork = playlistSongs.find((s) => s.artworkUrl)?.artworkUrl;

  return (
    <div className="detail-page-container">
      <button className="back-nav-btn" onClick={onBack} type="button">
        <ArrowLeftIcon size={16} />
        <span>Back to Playlists</span>
      </button>

      {/* Playlist Hero */}
      <header className="album-detail-header">
        <div
          className="album-detail-artwork playlist-detail-cover"
          style={{ backgroundColor: playlist.coverColor || "var(--accent-primary)" }}
        >
          {firstArtwork ? (
            <img src={firstArtwork} alt={playlist.name} />
          ) : (
            <span className="playlist-large-letter">{playlist.name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="album-detail-meta">
          <span className="detail-tag">Playlist</span>

          {isEditing ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="playlist-edit-input"
                autoFocus
              />
              <button className="btn-secondary" onClick={handleSaveName} style={{ padding: '6px 12px' }}>
                Save
              </button>
            </div>
          ) : (
            <h1
              className="album-detail-title"
              onClick={() => setIsEditing(true)}
              title="Click to rename"
              style={{ cursor: 'pointer' }}
            >
              {playlist.name}
            </h1>
          )}

          <div className="album-detail-submeta">
            <span>{playlistSongs.length} {playlistSongs.length === 1 ? 'track' : 'tracks'}, {totalMinutes} min</span>
          </div>

          <p className="detail-description">
            {playlist.description || "Offline user playlist."}
          </p>

          <div className="detail-action-buttons">
            <button
              className="btn-primary"
              onClick={() => playlistSongs[0] && onPlaySong?.(playlistSongs[0], playlistSongs)}
              disabled={playlistSongs.length === 0}
              type="button"
            >
              <PlayIcon size={15} color="#ffffff" />
              <span>Play</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => {
                const random = playlistSongs[Math.floor(Math.random() * playlistSongs.length)];
                if (random) onPlaySong?.(random, playlistSongs);
              }}
              disabled={playlistSongs.length === 0}
              type="button"
            >
              <ShuffleIcon size={15} color="#ffffff" />
              <span>Shuffle</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => {
                if (confirm(`Delete playlist "${playlist.name}"?`)) {
                  onDeletePlaylist(playlist.id);
                  onBack();
                }
              }}
              style={{ color: '#fa2d48', borderColor: 'rgba(250, 45, 72, 0.3)' }}
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Playlist Track Table */}
      <section className="album-tracklist-section">
        <div className="songs-table-header">
          <span className="col-num">#</span>
          <span className="col-title">Title</span>
          <span className="col-artist">Artist</span>
          <span className="col-album">Album</span>
          <span className="col-time">Time</span>
        </div>

        <div className="songs-list">
          {playlistSongs.map((song, idx) => (
            <div
              key={`${song.id}-${idx}`}
              className="song-row"
              onDoubleClick={() => onPlaySong?.(song, playlistSongs)}
            >
              <div className="col-num">
                <span className="track-index">{idx + 1}</span>
                <button
                  className="row-play-btn"
                  onClick={() => onPlaySong?.(song, playlistSongs)}
                  title="Play"
                  type="button"
                >
                  <PlayIcon size={12} color="#ffffff" />
                </button>
              </div>

              <div className="col-title song-title-cell">
                {song.artworkUrl ? (
                  <img src={song.artworkUrl} alt="" className="song-row-thumb" />
                ) : null}
                <span className="song-name-text">{song.title}</span>
              </div>

              <span className="col-artist">{song.artist}</span>
              <span className="col-album">{song.album}</span>
              
              <div className="col-time" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                <span>{formatDuration(song.duration)}</span>
                <button
                  className="row-remove-btn"
                  onClick={(e) => handleRemoveSong(e, song.id)}
                  title="Remove from playlist"
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {playlistSongs.length === 0 && (
            <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>This playlist is empty. Add songs from your library by clicking "+ Add to Playlist".</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default PlaylistDetailPage;