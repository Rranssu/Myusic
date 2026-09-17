import React from 'react';
import type { Album } from '../types/music';
import { AlbumsIcon } from '../components/icons/Icons';

interface AlbumsPageProps {
  albums: Album[];
  onSelectAlbum?: (album: Album) => void;
}

export function AlbumsPage({ albums, onSelectAlbum }: AlbumsPageProps) {
  if (albums.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlbumsIcon size={48} color="var(--text-muted)" />
        <h3 style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>No Albums Found</h3>
        <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>Scan a music directory to build your album discography.</p>
      </div>
    );
  }

  return (
    <div className="albums-page">
      <div className="section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="section-title">Albums</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {albums.length} {albums.length === 1 ? 'album' : 'albums'}
          </p>
        </div>
      </div>

      <div className="grid-cards">
        {albums.map((album) => (
          <div
            key={album.id}
            className="music-card"
            onClick={() => onSelectAlbum?.(album)}
          >
            <div className="music-card-artwork">
              {album.artworkUrl ? (
                <img src={album.artworkUrl} alt={album.title} />
              ) : (
                <AlbumsIcon size={48} color="rgba(255, 255, 255, 0.25)" />
              )}
            </div>
            <div className="music-card-info">
              <h4>{album.title}</h4>
              <p>{album.artist}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlbumsPage;