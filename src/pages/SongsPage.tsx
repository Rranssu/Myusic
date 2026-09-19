import React from 'react';
import type { Song } from '../types/music';
import { PlayIcon, SongsIcon, MoreHorizontalIcon } from '../components/icons/Icons';

interface SongsPageProps {
  songs: Song[];
  onPlaySong?: (song: Song) => void;
  onOpenTrackMenu?: (e: React.MouseEvent, song: Song) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function SongsPage({ songs, onPlaySong, onOpenTrackMenu }: SongsPageProps) {
  if (songs.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <SongsIcon size={48} color="var(--text-muted)" />
        <h3 style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>No Songs Found</h3>
        <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>Scan a music folder from the Home page to populate your library.</p>
      </div>
    );
  }

  return (
    <div className="songs-page">
      <div className="section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="section-title">Songs</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>
      </div>

      <div className="songs-table-header">
        <span className="col-num">#</span>
        <span className="col-title">Title</span>
        <span className="col-artist">Artist</span>
        <span className="col-album">Album</span>
        <span className="col-time">Time</span>
      </div>

      <div className="songs-list">
        {songs.map((song, idx) => (
          <div
            key={song.id}
            className="song-row"
            onDoubleClick={() => onPlaySong?.(song)}
            onContextMenu={(e) => onOpenTrackMenu?.(e, song)}
          >
            <div className="col-num">
              <span className="track-index">{idx + 1}</span>
              <button
                className="row-play-btn"
                onClick={() => onPlaySong?.(song)}
                title="Play track"
                type="button"
              >
                <PlayIcon size={12} color="#ffffff" />
              </button>
            </div>

            <div className="col-title song-title-cell">
              {song.artworkUrl ? (
                <img src={song.artworkUrl} alt="" className="song-row-thumb" />
              ) : (
                <div className="song-row-thumb placeholder">
                  <SongsIcon size={14} color="rgba(255,255,255,0.4)" />
                </div>
              )}
              <span className="song-name-text">{song.title}</span>
            </div>

            <span className="col-artist">{song.artist}</span>
            <span className="col-album">{song.album}</span>

            {/* Time & 3-Dot More Button */}
            <div className="col-time" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              <span>{formatDuration(song.duration)}</span>
              <button
                className="row-more-btn"
                onClick={(e) => onOpenTrackMenu?.(e, song)}
                title="More Actions"
                type="button"
              >
                <MoreHorizontalIcon size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SongsPage;