import React from 'react';
import type { Song } from '../../types/music';

interface TrackDetailsModalProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function TrackDetailsModal({ song, isOpen, onClose }: TrackDetailsModalProps) {
  if (!isOpen || !song) return null;

  const ext = song.filePath.split('.').pop()?.toUpperCase() || 'AUDIO';

  const handleShowInFolder = () => {
    window.electronAPI?.showItemInFolder?.(song.filePath);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card track-details-card" onClick={(e) => e.stopPropagation()}>
        <div className="track-details-header">
          <div className="track-details-thumb">
            {song.artworkUrl ? (
              <img src={song.artworkUrl} alt="" />
            ) : (
              <div className="track-details-thumb-placeholder">{ext}</div>
            )}
          </div>
          <div>
            <h2 className="modal-title" style={{ marginBottom: '4px' }}>{song.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{song.artist} — {song.album}</p>
          </div>
        </div>

        <div className="track-info-grid">
          <div className="track-info-item">
            <span className="info-label">Format</span>
            <span className="info-value">{ext}</span>
          </div>

          <div className="track-info-item">
            <span className="info-label">Duration</span>
            <span className="info-value">{formatDuration(song.duration)} ({song.duration}s)</span>
          </div>

          <div className="track-info-item">
            <span className="info-label">Track Number</span>
            <span className="info-value">{song.trackNumber ? `#${song.trackNumber}` : '—'}</span>
          </div>

          <div className="track-info-item">
            <span className="info-label">Year</span>
            <span className="info-value">{song.year || '—'}</span>
          </div>

          <div className="track-info-item full-width">
            <span className="info-label">File Location</span>
            <span className="info-value path-value" title={song.filePath}>{song.filePath}</span>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button type="button" className="btn-secondary" onClick={handleShowInFolder}>
            Show in Explorer
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrackDetailsModal;