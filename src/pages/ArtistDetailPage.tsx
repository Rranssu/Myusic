import React, { useState, useMemo, useEffect } from 'react';
import type { Artist, Album, Song } from '../types/music';
import {
  ArrowLeftIcon,
  PlayIcon,
  ShuffleIcon,
  StarIcon,
  ArtistsIcon,
  AlbumsIcon,
  MoreHorizontalIcon
} from '../components/icons/Icons';

export interface ArtistDetailPageProps {
  artist: Artist;
  allSongs: Song[];
  allAlbums: Album[];
  onBack: () => void;
  onPlaySong?: (song: Song, songsList?: Song[]) => void;
  onSelectAlbum?: (album: Album) => void;
  onSelectArtist?: (artistName: string) => void;
  onOpenTrackMenu?: (e: React.MouseEvent, song: Song) => void;
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
  onSelectAlbum,
  onSelectArtist,
  onOpenTrackMenu
}: ArtistDetailPageProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [similarArtists, setSimilarArtists] = useState<any[]>([]);

  // Filter songs & albums by this artist
  const artistSongs = allSongs.filter(
    (s) => s.artist.toLowerCase() === artist.name.toLowerCase()
  );
  const artistAlbums = allAlbums.filter(
    (a) => a.artist.toLowerCase() === artist.name.toLowerCase()
  );

  // Fetch similar artists online (Phase 6 Music Graph)
  useEffect(() => {
    if (artist.name && window.electronAPI?.getSimilarArtists) {
      window.electronAPI.getSimilarArtists(artist.name).then((res: any) => {
        if (res && Array.isArray(res)) {
          setSimilarArtists(res);
        }
      });
    }
  }, [artist.name]);

  // Determine Most Played / Top Album
  const mostPlayedAlbum = useMemo<Album | null>(() => {
    if (artistAlbums.length === 0) return null;
    return artistAlbums.reduce((prev, curr) =>
      (curr.songCount || 0) > (prev.songCount || 0) ? curr : prev
    , artistAlbums[0]);
  }, [artistAlbums]);

  return (
    <div className="artist-page-fullbleed">
      {/* 1. Full-Bleed Panoramic Hero Header */}
      <div className="artist-hero-parallax">
        {/* Floating Top Navigation */}
        <div className="artist-hero-nav">
          <button className="artist-circle-nav-btn" onClick={onBack} title="Back" type="button">
            <ArrowLeftIcon size={18} color="#ffffff" />
          </button>
        </div>

        {/* Full-Width Background Photo with Soft Bottom Dissolve */}
        <div className="artist-hero-media">
          {artist.artworkUrl ? (
            <img src={artist.artworkUrl} alt={artist.name} className="artist-hero-img" />
          ) : (
            <div className="artist-hero-fallback">
              <ArtistsIcon size={120} color="rgba(255, 255, 255, 0.25)" />
            </div>
          )}
          <div className="artist-hero-gradient-overlay" />
        </div>

        {/* Centered Artist Name & 3-Button Action Cluster */}
        <div className="artist-hero-center-cluster">
          <h1 className="artist-hero-name">{artist.name}</h1>

          <div className="artist-action-cluster">
            {/* Info / Bio Toggle */}
            <button
              className={`artist-cluster-btn info-btn ${showBio ? 'active' : ''}`}
              onClick={() => setShowBio(!showBio)}
              title="Artist Biography & Info"
              type="button"
            >
              <span>i</span>
            </button>

            {/* Giant Center Play Button */}
            <button
              className="artist-cluster-play-btn"
              onClick={() => artistSongs[0] && onPlaySong?.(artistSongs[0], artistSongs)}
              title="Play Artist"
              type="button"
            >
              <PlayIcon size={24} color="#000000" />
            </button>

            {/* Favorite Star Button */}
            <button
              className={`artist-cluster-btn star-btn ${isFavorite ? 'favorite-active' : ''}`}
              onClick={() => setIsFavorite(!isFavorite)}
              title="Favorite Artist"
              type="button"
            >
              <StarIcon size={20} color={isFavorite ? "#fa2d48" : "#ffffff"} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="artist-main-content">
        {/* Toggleable "About" Editorial Biography Card */}
        {showBio && (
          <div className="artist-bio-card-expand">
            <div className="detail-description-box" style={{ maxWidth: '100%', marginBottom: '36px' }}>
              <span className="editors-notes-tag">About {artist.name}</span>
              <p className="detail-description">
                {artist.description
                  ? artist.description
                  : `${artist.name} is a featured artist in your collection with ${artistSongs.length} local audio tracks across ${artistAlbums.length} albums.`}
              </p>
            </div>
          </div>
        )}

        {/* 2. Most Played Album Big Showcase Card */}
        {mostPlayedAlbum && (
          <div
            className="artist-big-featured-card"
            onClick={() => onSelectAlbum?.(mostPlayedAlbum)}
          >
            <div className="big-featured-artwork-wrap">
              {mostPlayedAlbum.artworkUrl ? (
                <img
                  src={mostPlayedAlbum.artworkUrl}
                  alt={mostPlayedAlbum.title}
                  className="big-featured-artwork"
                />
              ) : (
                <div className="big-featured-artwork-placeholder">
                  <AlbumsIcon size={56} color="rgba(255, 255, 255, 0.3)" />
                </div>
              )}
              <button
                className="big-featured-hover-play"
                onClick={(e) => {
                  e.stopPropagation();
                  const albumTracks = allSongs.filter(
                    (s) => s.album.toLowerCase() === mostPlayedAlbum.title.toLowerCase()
                  );
                  if (albumTracks[0]) onPlaySong?.(albumTracks[0], albumTracks);
                }}
                title="Play Album"
                type="button"
              >
                <PlayIcon size={20} color="#000000" />
              </button>
            </div>

            <div className="big-featured-meta">
              <span className="big-featured-badge">Most Played Album</span>
              <h3 className="big-featured-title">{mostPlayedAlbum.title}</h3>

              <p className="big-featured-submeta">
                {mostPlayedAlbum.year && `${mostPlayedAlbum.year} • `}
                {mostPlayedAlbum.genre && `${mostPlayedAlbum.genre} • `}
                {mostPlayedAlbum.songCount} {mostPlayedAlbum.songCount === 1 ? 'song' : 'songs'}
              </p>

              <p className="big-featured-desc">
                {mostPlayedAlbum.description
                  ? mostPlayedAlbum.description
                  : `High-fidelity offline release by ${artist.name}. Click to explore the complete tracklist.`}
              </p>

              <div className="big-featured-actions">
                <button
                  className="btn-primary"
                  style={{ backgroundColor: 'var(--accent-primary)', padding: '9px 18px', fontSize: '0.85rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const albumTracks = allSongs.filter(
                      (s) => s.album.toLowerCase() === mostPlayedAlbum.title.toLowerCase()
                    );
                    if (albumTracks[0]) onPlaySong?.(albumTracks[0], albumTracks);
                  }}
                  type="button"
                >
                  <PlayIcon size={14} color="#ffffff" />
                  <span>Play Album</span>
                </button>

                <button
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAlbum?.(mostPlayedAlbum);
                  }}
                  type="button"
                >
                  <span>View Album</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Top Songs List */}
        <section className="artist-content-section">
          <div className="section-header">
            <h3 className="section-title">Top Songs</h3>
          </div>

          <div className="artist-top-songs-list">
            {artistSongs.slice(0, 10).map((song) => (
              <div
                key={song.id}
                className="artist-song-row"
                onDoubleClick={() => onPlaySong?.(song, artistSongs)}
                onContextMenu={(e) => onOpenTrackMenu?.(e, song)}
              >
                <div className="artist-song-thumb-wrap">
                  {song.artworkUrl ? (
                    <img src={song.artworkUrl} alt="" className="artist-song-thumb" />
                  ) : (
                    <div className="artist-song-thumb placeholder">
                      <AlbumsIcon size={16} color="rgba(255,255,255,0.4)" />
                    </div>
                  )}
                  <button
                    className="artist-song-hover-play"
                    onClick={() => onPlaySong?.(song, artistSongs)}
                    title="Play"
                    type="button"
                  >
                    <PlayIcon size={12} color="#ffffff" />
                  </button>
                </div>

                <div className="artist-song-info">
                  <span className="artist-song-title">{song.title}</span>
                  <span className="artist-song-subtitle">
                    {song.album} {song.year ? `• ${song.year}` : ''}
                  </span>
                </div>

                <div className="artist-song-actions">
                  <span className="artist-song-time">{formatDuration(song.duration)}</span>
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

        {/* 4. Albums Discography */}
        {artistAlbums.length > 0 && (
          <section className="artist-content-section">
            <div className="section-header">
              <h3 className="section-title">Albums</h3>
            </div>
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

        {/* 5. Similar Artists Shelf (Phase 6) */}
        {similarArtists.length > 0 && (
          <section className="artist-content-section" style={{ marginTop: '48px' }}>
            <div className="section-header">
              <h3 className="section-title">Similar Artists</h3>
            </div>
            <div className="grid-cards">
              {similarArtists.slice(0, 6).map((sim) => (
                <div
                  key={sim.id}
                  className="music-card artist-card"
                  onClick={() => onSelectArtist?.(sim.name)}
                >
                  <div className="music-card-artwork artist-avatar">
                    <img src={sim.artworkUrl} alt={sim.name} />
                  </div>
                  <div className="music-card-info" style={{ textAlign: 'center' }}>
                    <h4>{sim.name}</h4>
                    <p style={{ color: sim.inLibrary ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                      {sim.inLibrary ? 'In Library' : 'Similar Style'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ArtistDetailPage;