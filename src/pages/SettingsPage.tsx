import { useState } from 'react';
import type { LibraryData } from '../types/music';

interface SettingsPageProps {
  library: LibraryData;
  isScanning: boolean;
  onScanFolder: () => void;
  onLibraryUpdated: (lib: LibraryData) => void;
}

export function SettingsPage({
  library,
  isScanning,
  onScanFolder,
  onLibraryUpdated
}: SettingsPageProps) {
  const [isFetchingStatic, setIsFetchingStatic] = useState(false);
  const [isFetchingAnimated, setIsFetchingAnimated] = useState(false);
  const [isFetchingArtist, setIsFetchingArtist] = useState(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);

  // 1. Static Metadata (iTunes + Wikipedia)
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

  // 2. Animated Artwork (.mp4 video loops)
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

  // 3. Artist Portraits & Biographies
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

  // 4. Batch Lyrics Downloader (LRCLIB)
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

      {/* 2. Static Metadata & Covers */}
      <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Static Album Metadata & Covers</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Download uncompressed 1000px cover artwork from iTunes, release year, genre, and Wikipedia album summaries.
        </p>
        <button className="btn-secondary" onClick={handleFetchStatic} disabled={isFetchingStatic} type="button">
          {isFetchingStatic ? 'Downloading Static Covers...' : 'Fetch Static Metadata & Covers'}
        </button>
      </div>

      {/* 3. Animated Video Covers */}
      <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Animated Album Covers</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Check Apple Music for official seamless looping video covers (.mp4) and assemble them directly into your offline cache.
        </p>
        <button className="btn-secondary" onClick={handleFetchAnimated} disabled={isFetchingAnimated} type="button">
          {isFetchingAnimated ? 'Assembling Animated Loops...' : 'Fetch Animated Video Covers'}
        </button>
      </div>

      {/* 4. Artist Portraits & Biographies */}
      <div style={{ background: 'var(--bg-card)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '6px' }}>Artist Portraits & Biographies</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Fetch high-resolution studio portraits from Deezer/Wikipedia and encyclopedic artist biographies into local storage.
        </p>
        <button className="btn-secondary" onClick={handleFetchArtist} disabled={isFetchingArtist} type="button">
          {isFetchingArtist ? 'Fetching Artist Data...' : 'Fetch Artist Portraits & Bios'}
        </button>
      </div>

      {/* 5. Lyrics Downloader */}
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