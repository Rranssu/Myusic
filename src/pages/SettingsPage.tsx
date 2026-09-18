import { useState } from 'react';
import type { LibraryData } from '../types/music';

interface SettingsPageProps {
  library: LibraryData;
  isScanning: boolean;
  onScanFolder: () => void;
  onLibraryUpdated: (lib: LibraryData) => void;
  crossfadeDuration: number;
  onCrossfadeChange: (seconds: number) => void;
}

export function SettingsPage({
  library,
  isScanning,
  onScanFolder,
  onLibraryUpdated,
  crossfadeDuration,
  onCrossfadeChange
}: SettingsPageProps) {
  const [isFetchingStatic, setIsFetchingStatic] = useState(false);
  const [isFetchingAnimated, setIsFetchingAnimated] = useState(false);
  const [isFetchingArtist, setIsFetchingArtist] = useState(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);

  const handleFetchStatic = async () => {
    if (!window.electronAPI?.fetchStaticMetadata) return;
    try {
      setIsFetchingStatic(true);
      const updated = await window.electronAPI.fetchStaticMetadata();
      if (updated) onLibraryUpdated(updated);
    } finally {
      setIsFetchingStatic(false);
    }
  };

  const handleFetchAnimated = async () => {
    if (!window.electronAPI?.fetchAnimatedMetadata) return;
    try {
      setIsFetchingAnimated(true);
      const updated = await window.electronAPI.fetchAnimatedMetadata();
      if (updated) onLibraryUpdated(updated);
    } finally {
      setIsFetchingAnimated(false);
    }
  };

  const handleFetchArtist = async () => {
    if (!window.electronAPI?.fetchArtistMetadata) return;
    try {
      setIsFetchingArtist(true);
      const updated = await window.electronAPI.fetchArtistMetadata();
      if (updated) onLibraryUpdated(updated);
    } finally {
      setIsFetchingArtist(false);
    }
  };

  const handleFetchLyrics = async () => {
    if (!window.electronAPI?.fetchLyricsMetadata) return;
    try {
      setIsFetchingLyrics(true);
      await window.electronAPI.fetchLyricsMetadata();
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  return (
    <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '820px' }}>
      <h2 className="section-title">Settings</h2>

      {/* 1. Local Music Folder */}
      <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Local Music Library</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {library.songs.length} tracks indexed from local disk storage.
        </p>
        <button className="btn-primary" onClick={onScanFolder} disabled={isScanning} type="button">
          {isScanning ? 'Scanning Directory...' : 'Scan / Change Folder'}
        </button>
      </div>

      {/* 2. Audio Playback & Seamless Crossfade Slider */}
      <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Seamless Playback & Crossfade</h3>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: crossfadeDuration > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            {crossfadeDuration === 0 ? "Off (Disabled)" : `${crossfadeDuration} seconds`}
          </span>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Fades out the ending track while fading in the next track with no pause between songs. Set to 0 to disable.
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>0s</span>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={crossfadeDuration}
            onChange={(e) => onCrossfadeChange(parseInt(e.target.value, 10))}
            style={{
              flex: 1,
              height: '4px',
              accentColor: 'var(--accent-primary)',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>12s</span>
        </div>
      </div>

      {/* 3. Static Metadata & Covers */}
      <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Static Album Metadata & Covers</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Download uncompressed 1000px cover artwork from iTunes, release year, genre, and Wikipedia album summaries.
        </p>
        <button className="btn-secondary" onClick={handleFetchStatic} disabled={isFetchingStatic} type="button">
          {isFetchingStatic ? 'Downloading Static Covers...' : 'Fetch Static Metadata & Covers'}
        </button>
      </div>

      {/* 4. Animated Video Covers */}
      <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Animated Album Covers</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Check Apple Music for official seamless looping video covers (.mp4) and assemble them directly into your offline cache.
        </p>
        <button className="btn-secondary" onClick={handleFetchAnimated} disabled={isFetchingAnimated} type="button">
          {isFetchingAnimated ? 'Assembling Animated Loops...' : 'Fetch Animated Video Covers'}
        </button>
      </div>

      {/* 5. Artist Portraits & Biographies */}
      <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Artist Portraits & Biographies</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Fetch high-resolution studio portraits from Deezer/Wikipedia and encyclopedic artist biographies into local storage.
        </p>
        <button className="btn-secondary" onClick={handleFetchArtist} disabled={isFetchingArtist} type="button">
          {isFetchingArtist ? 'Fetching Artist Data...' : 'Fetch Artist Portraits & Bios'}
        </button>
      </div>

      {/* 6. Lyrics Downloader */}
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
  );
}

export default SettingsPage;