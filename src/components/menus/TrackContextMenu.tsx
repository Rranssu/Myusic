import React, { useEffect, useRef, useState } from 'react';
import type { Song, Playlist } from '../../types/music';
import {
  PlayIcon,
  PlaylistIcon,
  AlbumsIcon,
  ArtistsIcon,
  LyricsIcon
} from '../icons/Icons';

interface TrackContextMenuProps {
  song: Song;
  position: { x: number; y: number };
  playlists: Playlist[];
  onClose: () => void;
  onPlayNext: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onAddToPlaylist: (playlistId: string, songId: string) => void;
  onGoToAlbum: (albumTitle: string) => void;
  onGoToArtist: (artistName: string) => void;
  onFetchMetadata: (song: Song) => void;
  onFetchAnimated: (song: Song) => void;
  onShowDetails: (song: Song) => void;
}

export function TrackContextMenu({
  song,
  position,
  playlists,
  onClose,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  onGoToAlbum,
  onGoToArtist,
  onFetchMetadata,
  onFetchAnimated,
  onShowDetails
}: TrackContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Keep menu within screen boundaries
  const safeX = Math.min(position.x, window.innerWidth - 240);
  const safeY = Math.min(position.y, window.innerHeight - 340);

  return (
    <div
      ref={menuRef}
      className="track-context-menu"
      style={{ top: `${safeY}px`, left: `${safeX}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="menu-header-preview">
        <span className="menu-preview-title">{song.title}</span>
        <span className="menu-preview-artist">{song.artist}</span>
      </div>

      <div className="menu-divider" />

      {/* Play Next & Add to Queue */}
      <button
        className="context-menu-item"
        onClick={() => { onPlayNext(song); onClose(); }}
        type="button"
      >
        <PlayIcon size={14} color="#ffffff" />
        <span>Play Next</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => { onAddToQueue(song); onClose(); }}
        type="button"
      >
        <PlaylistIcon size={14} color="#ffffff" />
        <span>Add to Queue</span>
      </button>

      <div className="menu-divider" />

      {/* Add to Playlist with Hover Submenu */}
      <div
        className="context-menu-item has-submenu"
        onMouseEnter={() => setShowPlaylistSubmenu(true)}
        onMouseLeave={() => setShowPlaylistSubmenu(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PlaylistIcon size={14} color="#ffffff" />
          <span>Add to Playlist</span>
        </div>
        <span className="submenu-arrow">›</span>

        {showPlaylistSubmenu && (
          <div className="context-submenu">
            {playlists.length > 0 ? (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  className="context-menu-item"
                  onClick={() => {
                    onAddToPlaylist(pl.id, song.id);
                    onClose();
                  }}
                  type="button"
                >
                  <span
                    className="playlist-mini-thumb"
                    style={{ width: '16px', height: '16px', fontSize: '0.6rem', backgroundColor: pl.coverColor || '#fa2d48' }}
                  >
                    {pl.name.charAt(0).toUpperCase()}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pl.name}
                  </span>
                </button>
              ))
            ) : (
              <div style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                No playlists created
              </div>
            )}
          </div>
        )}
      </div>

      {/* Go to Album & Artist */}
      <button
        className="context-menu-item"
        onClick={() => { onGoToAlbum(song.album); onClose(); }}
        type="button"
      >
        <AlbumsIcon size={14} color="#ffffff" />
        <span>Go to Album</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => { onGoToArtist(song.artist); onClose(); }}
        type="button"
      >
        <ArtistsIcon size={14} color="#ffffff" />
        <span>Go to Artist</span>
      </button>

      <div className="menu-divider" />

      {/* Metadata & Animation Triggers */}
      <button
        className="context-menu-item"
        onClick={() => { onFetchMetadata(song); onClose(); }}
        type="button"
      >
        <AlbumsIcon size={14} color="var(--accent-primary)" />
        <span>Fetch Album Metadata</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => { onFetchAnimated(song); onClose(); }}
        type="button"
      >
        <PlayIcon size={14} color="var(--accent-primary)" />
        <span>Fetch Animated Cover</span>
      </button>

      <div className="menu-divider" />

      {/* Track Info (Get Info) */}
      <button
        className="context-menu-item"
        onClick={() => { onShowDetails(song); onClose(); }}
        type="button"
      >
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>ⓘ</span>
        <span>Track Details</span>
      </button>
    </div>
  );
}

export default TrackContextMenu;