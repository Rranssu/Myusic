import React from 'react';
import type { LibraryData, Album, Song } from '../types/music';
import { PlusIcon, AlbumsIcon, PlayIcon } from '../components/icons/Icons';

interface HomePageProps {
  library?: LibraryData;
  onScanFolderClick: () => void;
  onSelectAlbum?: (album: Album) => void;
  onPlaySong?: (song: Song) => void;
}

export function HomePage({
  library = { songs: [], albums: [], artists: [], lastScanned: 0 },
  onScanFolderClick,
  onSelectAlbum,
  onPlaySong
}: HomePageProps) {
  const hasMusic = library.songs && library.songs.length > 0;

  return (
    <div className="home-page">
      {/* Hero Welcome Banner */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">Welcome to Myusic</div>
          <h2 className="hero-title">
            {hasMusic ? `${library.songs.length} Tracks In Your Library` : 'Your Personal Music Experience'}
          </h2>
          <p className="hero-subtitle">
            {hasMusic
              ? `Currently monitoring ${library.albums.length} albums across ${library.artists.length} artists with offline metadata caching.`
              : 'Scan your high-fidelity MP3s, FLACs, and AAC tracks to get started.'}
          </p>
          <div className="hero-actions">
            {hasMusic ? (
              <button
                className="btn-primary"
                onClick={() => library.songs[0] && onPlaySong?.(library.songs[0])}
                type="button"
              >
                <PlayIcon size={16} color="#ffffff" />
                <span>Play Library</span>
              </button>
            ) : null}

            <button className="btn-secondary" onClick={onScanFolderClick} type="button">
              <PlusIcon size={16} color="#ffffff" />
              <span>{hasMusic ? 'Rescan / Change Folder' : 'Scan Music Folder'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Real Indexed Albums Section */}
      <section>
        <div className="section-header">
          <h3 className="section-title">
            {hasMusic ? 'Recently Added Albums' : 'No Music Scanned Yet'}
          </h3>
        </div>

        {hasMusic ? (
          <div className="grid-cards">
            {library.albums.slice(0, 12).map((album) => (
              <div
                key={album.id}
                className="music-card"
                onClick={() => onSelectAlbum?.(album)}
              >
                <div className="music-card-artwork">
                  {album.artworkUrl ? (
                    <img src={album.artworkUrl} alt={album.title} />
                  ) : (
                    <AlbumsIcon size={44} color="#353542" />
                  )}
                </div>
                <div className="music-card-info">
                  <h4>{album.title}</h4>
                  <p>{album.artist}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Click "Scan Music Folder" to select your local library directory.
          </p>
        )}
      </section>
    </div>
  );
}

export default HomePage;