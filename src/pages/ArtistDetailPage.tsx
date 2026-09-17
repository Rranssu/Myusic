import React from 'react';
import type { Artist, Album, Song } from '../types/music';
import { ArrowLeftIcon, PlayIcon, ShuffleIcon, ArtistsIcon, AlbumsIcon } from '../components/icons/Icons';

interface ArtistDetailPageProps {
  artist: Artist;
  allSongs: Song[];
  allAlbums: Album[];
  onBack: () => void;
  onPlaySong?: (song: Song, songsList?: Song[]) => void;
  onSelectAlbum?: (album: Album) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function ArtistDetailPage({
  artist,
  allSongs,
  allAlbums,
  onBack,
  onPlaySong,
  onSelectAlbum
}: ArtistDetailPageProps) {
  const artistSongs = allSongs.filter(
    (s) => s.artist.toLowerCase() === artist.name.toLowerCase()
  );
  const artistAlbums = allAlbums.filter(
    (a) => a.artist.toLowerCase() === artist.name.toLowerCase()
  );

  return (
    <div className="detail-page-container artist-page-adaptive">
      {/* Back Navigation Button */}
      <button className="back-nav-btn" onClick={onBack} type="button">
        <ArrowLeftIcon size={16} />
        <span>Back</span>
      </button>

      {/* Artist Hero Header */}
      <header className="artist-detail-header">
        <div
          className="artist-detail-avatar"
          style={{ boxShadow: `0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px var(--accent-glow)` }}
        >
          {artist.artworkUrl ? (
            <img src={artist.artworkUrl} alt={artist.name} />
          ) : (
            <ArtistsIcon size={80} color="rgba(255, 255, 255, 0.3)" />
          )}
        </div>

        <div className="artist-detail-meta">
          <span className="detail-tag">Artist</span>
          <h1 className="artist-detail-title">{artist.name}</h1>

          <div className="album-detail-submeta">
            <span>{artistSongs.length} tracks • {artistAlbums.length} {artistAlbums.length === 1 ? 'album' : 'albums'} in library</span>
          </div>

          {/* About / Biography Box */}
          <div className="detail-description-box" style={{ maxWidth: '640px' }}>
            <span className="editors-notes-tag">About {artist.name}</span>
            <p className="detail-description">
              {artist.description
                ? artist.description
                : `${artist.name} is a featured artist in your library with ${artistSongs.length} local audio tracks.`}
            </p>
          </div>

          <div className="detail-action-buttons">
            <button
              className="btn-primary"
              onClick={() => artistSongs[0] && onPlaySong?.(artistSongs[0], artistSongs)}
              type="button"
            >
              <PlayIcon size={15} color="#ffffff" />
              <span>Play</span>
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                const random = artistSongs[Math.floor(Math.random() * artistSongs.length)];
                if (random) onPlaySong?.(random, artistSongs);
              }}
              type="button"
            >
              <ShuffleIcon size={15} color="#ffffff" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </header>

      {/* Discography Section */}
      {artistAlbums.length > 0 && (
        <section style={{ marginBottom: '40px', position: 'relative', zIndex: 1 }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>Albums</h3>
          <div className="grid-cards">
            {artistAlbums.map((album) => (
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
                  <p>{album.year ? `${album.year}` : `${album.songCount} songs`}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Tracks By Artist */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <h3 className="section-title" style={{ marginBottom: '16px' }}>Tracks</h3>
        <div className="songs-table-header album-table-header">
          <span className="col-num">#</span>
          <span className="col-title">Title</span>
          <span className="col-time">Time</span>
        </div>

        <div className="songs-list">
          {artistSongs.map((song, idx) => (
            <div
              key={song.id}
              className="song-row album-song-row"
              onDoubleClick={() => onPlaySong?.(song, artistSongs)}
            >
              <div className="col-num">
                <span className="track-index">{idx + 1}</span>
                <button
                  className="row-play-btn"
                  onClick={() => onPlaySong?.(song, artistSongs)}
                  title="Play"
                  type="button"
                >
                  <PlayIcon size={12} color="var(--accent-primary)" />
                </button>
              </div>

              <div className="col-title song-title-cell">
                <span className="song-name-text">{song.title}</span>
              </div>

              <span className="col-time">{formatDuration(song.duration)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ArtistDetailPage;