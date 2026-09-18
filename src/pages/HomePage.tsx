import React, { useMemo } from 'react';
import type { LibraryData, Album, Song, Artist } from '../types/music';
import { PlusIcon, AlbumsIcon, PlayIcon, ShuffleIcon, ArtistsIcon } from '../components/icons/Icons';

interface HomePageProps {
  library?: LibraryData;
  onScanFolderClick: () => void;
  onSelectAlbum?: (album: Album) => void;
  onPlaySong?: (song: Song, customQueue?: Song[]) => void;
}

interface RecommendedMix {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  songs: Song[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomePage({
  library = { songs: [], albums: [], artists: [], lastScanned: 0 },
  onScanFolderClick,
  onSelectAlbum,
  onPlaySong
}: HomePageProps) {
  const hasMusic = library.songs && library.songs.length > 0;
  const greeting = getGreeting();

  // Compute total offline listening time in hours
  const totalHours = useMemo(() => {
    if (!hasMusic) return "0";
    const totalSeconds = library.songs.reduce((acc, s) => acc + s.duration, 0);
    const hours = totalSeconds / 3600;
    return hours >= 1 ? `${hours.toFixed(1)} hrs` : `${Math.round(totalSeconds / 60)} mins`;
  }, [hasMusic, library.songs]);

  // Spotlight a featured artist from the user's library ("Remember this artist?")
  const spotlightArtist = useMemo<Artist | null>(() => {
    if (!library.artists || library.artists.length === 0) return null;
    // Pick an artist with songs
    const artistsWithTracks = library.artists.filter((a) => a.songCount > 0);
    if (artistsWithTracks.length === 0) return library.artists[0];
    // Semi-stable pick based on day
    const dayIndex = new Date().getDate() % artistsWithTracks.length;
    return artistsWithTracks[dayIndex] || artistsWithTracks[0];
  }, [library.artists]);

  const spotlightSongs = useMemo<Song[]>(() => {
    if (!spotlightArtist || !hasMusic) return [];
    return library.songs.filter(
      (s) => s.artist.toLowerCase() === spotlightArtist.name.toLowerCase()
    );
  }, [spotlightArtist, hasMusic, library.songs]);

  // Smart Curated Mixes
  const recommendedMixes = useMemo<RecommendedMix[]>(() => {
    if (!hasMusic) return [];

    const songs = library.songs;
    const artistCounts = new Map<string, number>();
    songs.forEach((s) => {
      artistCounts.set(s.artist, (artistCounts.get(s.artist) || 0) + 1);
    });

    let topArtist = songs[0].artist;
    let maxCount = 0;
    artistCounts.forEach((count, artist) => {
      if (count > maxCount) {
        maxCount = count;
        topArtist = artist;
      }
    });

    const topArtistSongs = songs.filter(
      (s) => s.artist.toLowerCase() === topArtist.toLowerCase()
    );

    return [
      {
        id: "mix-favorites",
        title: "Favorites Mix",
        subtitle: "Top tracks from your local collection",
        gradient: "linear-gradient(135deg, #fa2d48 0%, #ff5e3a 100%)",
        songs: songs.slice(0, 10)
      },
      {
        id: "mix-essentials",
        title: `${topArtist} Essentials`,
        subtitle: `Curated catalog by ${topArtist}`,
        gradient: "linear-gradient(135deg, #4a72e8 0%, #8844ee 100%)",
        songs: topArtistSongs
      },
      {
        id: "mix-chill",
        title: "Chill Lounge Mix",
        subtitle: "Relaxed offline sounds for focus & downtime",
        gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
        songs: songs.slice().reverse().slice(0, 10)
      },
      {
        id: "mix-discovery",
        title: "Rediscover & Deep Cuts",
        subtitle: "Shuffled gems across your albums",
        gradient: "linear-gradient(135deg, #f857a6 0%, #ff5858 100%)",
        songs: songs.slice().sort(() => 0.5 - Math.random()).slice(0, 10)
      }
    ];
  }, [hasMusic, library.songs]);

  const handleShuffleLibrary = () => {
    if (!hasMusic || !onPlaySong) return;
    const shuffled = library.songs.slice().sort(() => 0.5 - Math.random());
    onPlaySong(shuffled[0], shuffled);
  };

  const handlePlaySpotlight = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spotlightSongs.length > 0 && onPlaySong) {
      onPlaySong(spotlightSongs[0], spotlightSongs);
    }
  };

  const handlePlayMix = (e: React.MouseEvent, mix: RecommendedMix) => {
    e.stopPropagation();
    if (mix.songs.length > 0 && onPlaySong) {
      onPlaySong(mix.songs[0], mix.songs);
    }
  };

  return (
    <div className="home-page">
      {/* Personalized Hero Banner with Integrated Greeting & Spotlight Card */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            {hasMusic ? `✨ ${greeting} • Library Hub` : `👋 ${greeting}`}
          </div>
          <h2 className="hero-title">
            {hasMusic ? "Ready to dive back into your music?" : "Your Personal Music Experience"}
          </h2>
          <p className="hero-subtitle">
            {hasMusic
              ? `${library.songs.length} tracks across ${library.albums.length} albums • ${totalHours} of offline audio.`
              : 'Scan your high-fidelity MP3s, FLACs, and AAC tracks to build your library.'}
          </p>

          <div className="hero-actions">
            {hasMusic ? (
              <button className="btn-primary" onClick={handleShuffleLibrary} type="button">
                <ShuffleIcon size={16} color="#ffffff" />
                <span>Shuffle Library</span>
              </button>
            ) : null}

            <button className="btn-secondary" onClick={onScanFolderClick} type="button">
              <PlusIcon size={16} color="#ffffff" />
              <span>{hasMusic ? 'Change Folder' : 'Scan Music Folder'}</span>
            </button>
          </div>
        </div>

        {/* Fun Feature: "Remember this artist?" Spotlight Widget */}
        {hasMusic && spotlightArtist && (
          <div className="hero-spotlight-card" onClick={handlePlaySpotlight}>
            <div className="spotlight-avatar-wrap">
              {spotlightArtist.artworkUrl ? (
                <img src={spotlightArtist.artworkUrl} alt={spotlightArtist.name} className="spotlight-avatar" />
              ) : (
                <div className="spotlight-avatar-placeholder">
                  <ArtistsIcon size={24} color="#ffffff" />
                </div>
              )}
              <button className="spotlight-play-badge" title="Play Artist" type="button">
                <PlayIcon size={12} color="#000000" />
              </button>
            </div>

            <div className="spotlight-meta">
              <span className="spotlight-badge-tag">Remember this artist?</span>
              <h4 className="spotlight-name">{spotlightArtist.name}</h4>
              <p className="spotlight-subtext">
                {spotlightSongs.length} {spotlightSongs.length === 1 ? 'track' : 'tracks'} in your collection
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Recommended Playlists / Made For You */}
      {hasMusic && (
        <section style={{ marginBottom: '38px' }}>
          <div className="section-header">
            <div>
              <h3 className="section-title">Made For You</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Curated smart mixes based on your listening library
              </p>
            </div>
          </div>

          <div className="grid-cards recommended-mixes-grid">
            {recommendedMixes.map((mix) => (
              <div
                key={mix.id}
                className="music-card mix-card"
                onClick={(e) => handlePlayMix(e, mix)}
              >
                <div
                  className="music-card-artwork mix-card-artwork"
                  style={{ background: mix.gradient }}
                >
                  <div className="mix-artwork-inner">
                    <span className="mix-badge">Myusic Mix</span>
                    <h3 className="mix-artwork-title">{mix.title}</h3>
                  </div>

                  <button
                    className="mix-hover-play-btn"
                    onClick={(e) => handlePlayMix(e, mix)}
                    title={`Play ${mix.title}`}
                    type="button"
                  >
                    <PlayIcon size={16} color="#000000" />
                  </button>
                </div>

                <div className="music-card-info">
                  <h4>{mix.title}</h4>
                  <p>{mix.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently Added Albums */}
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