import { useState } from 'react';
import type { Album, Song } from '../types/music';
import { ArrowLeftIcon, PlayIcon, ShuffleIcon, AlbumsIcon, MoreHorizontalIcon } from '../components/icons/Icons';

export interface AlbumDetailPageProps {
  album: Album;
  allSongs: Song[];
  onBack: () => void;
  onPlaySong?: (song: Song, albumSongs?: Song[]) => void;
  onSelectArtist?: (artistName: string) => void;
  onOpenTrackMenu?: (e: React.MouseEvent, song: Song) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function AlbumDetailPage({
  album,
  allSongs,
  onBack,
  onPlaySong,
  onSelectArtist,
  onOpenTrackMenu
}: AlbumDetailPageProps) {
  const [videoError, setVideoError] = useState(false);

  // Filter songs belonging to this album and sort by track number
  const albumSongs = allSongs
    .filter((s) => s.album.toLowerCase() === album.title.toLowerCase())
    .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

  const totalSeconds = albumSongs.reduce((acc, s) => acc + s.duration, 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  const animatedUrl = album.animatedArtworkUrl || albumSongs.find((s) => s.animatedArtworkUrl)?.animatedArtworkUrl;

  return (
    <div className="detail-page-container album-page-adaptive">
      {/* Back Navigation Button */}
      <button className="back-nav-btn" onClick={onBack} type="button">
        <ArrowLeftIcon size={16} />
        <span>Back</span>
      </button>

      {/* Album Header Hero */}
      <header className="album-detail-header">
        <div
          className="album-detail-artwork"
          style={{ boxShadow: `0 24px 60px rgba(0, 0, 0, 0.7), 0 0 35px var(--accent-glow)` }}
        >
          {animatedUrl && !videoError ? (
            <video
              key={animatedUrl}
              src={animatedUrl}
              poster={album.artworkUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setVideoError(true)}
            />
          ) : album.artworkUrl ? (
            <img src={album.artworkUrl} alt={album.title} />
          ) : (
            <AlbumsIcon size={80} color="rgba(255, 255, 255, 0.25)" />
          )}
        </div>

        <div className="album-detail-meta">
          <span className="detail-tag">Album</span>
          <h1 className="album-detail-title">{album.title}</h1>
          <button
            className="album-detail-artist-link"
            onClick={() => onSelectArtist?.(album.artist)}
            type="button"
          >
            {album.artist}
          </button>

          <div className="album-detail-submeta">
            {album.genre && <span>{album.genre} • </span>}
            {album.year && <span>{album.year} • </span>}
            <span>{albumSongs.length} {albumSongs.length === 1 ? 'song' : 'songs'}, {totalMinutes} min</span>
          </div>

          {/* Editors' Notes Box */}
          <div className="detail-description-box">
            <span className="editors-notes-tag">Editors' Notes</span>
            <p className="detail-description">
              {album.description
                ? album.description
                : `Available offline from your high-fidelity local audio storage. Released by ${album.artist}.`}
            </p>
          </div>

          <div className="detail-action-buttons">
            <button
              className="btn-primary"
              onClick={() => albumSongs[0] && onPlaySong?.(albumSongs[0], albumSongs)}
              type="button"
            >
              <PlayIcon size={15} color="#ffffff" />
              <span>Play</span>
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                const random = albumSongs[Math.floor(Math.random() * albumSongs.length)];
                if (random) onPlaySong?.(random, albumSongs);
              }}
              type="button"
            >
              <ShuffleIcon size={15} color="#ffffff" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </header>

      {/* Album Tracklist Table */}
      <section className="album-tracklist-section">
        <div className="songs-table-header album-table-header">
          <span className="col-num">#</span>
          <span className="col-title">Title</span>
          <span className="col-time">Time</span>
        </div>

        <div className="songs-list">
          {albumSongs.map((song, idx) => (
            <div
              key={song.id}
              className="song-row album-song-row"
              onDoubleClick={() => onPlaySong?.(song, albumSongs)}
              onContextMenu={(e) => onOpenTrackMenu?.(e, song)}
            >
              <div className="col-num">
                <span className="track-index">{song.trackNumber || idx + 1}</span>
                <button
                  className="row-play-btn"
                  onClick={() => onPlaySong?.(song, albumSongs)}
                  title="Play"
                  type="button"
                >
                  <PlayIcon size={12} color="var(--accent-primary)" />
                </button>
              </div>

              <div className="col-title song-title-cell">
                <span className="song-name-text">{song.title}</span>
              </div>

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
      </section>
    </div>
  );
}

export default AlbumDetailPage;