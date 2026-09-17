import React from 'react';
import type { Artist } from '../types/music';
import { ArtistsIcon } from '../components/icons/Icons';

interface ArtistsPageProps {
  artists: Artist[];
  onSelectArtist?: (artist: Artist) => void;
}

export function ArtistsPage({ artists, onSelectArtist }: ArtistsPageProps) {
  if (artists.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <ArtistsIcon size={48} color="var(--text-muted)" />
        <h3 style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>No Artists Found</h3>
        <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>Scan your music folder to populate artists.</p>
      </div>
    );
  }

  return (
    <div className="artists-page">
      <div className="section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="section-title">Artists</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {artists.length} {artists.length === 1 ? 'artist' : 'artists'}
          </p>
        </div>
      </div>

      <div className="grid-cards">
        {artists.map((artist) => (
          <div
            key={artist.id}
            className="music-card artist-card"
            onClick={() => onSelectArtist?.(artist)}
          >
            {/* Apple Music uses circular portraits for artists */}
            <div className="music-card-artwork artist-avatar">
              {artist.artworkUrl ? (
                <img src={artist.artworkUrl} alt={artist.name} />
              ) : (
                <ArtistsIcon size={42} color="rgba(255, 255, 255, 0.3)" />
              )}
            </div>
            <div className="music-card-info" style={{ textAlign: 'center' }}>
              <h4>{artist.name}</h4>
              <p>{artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ArtistsPage;