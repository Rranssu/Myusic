import React, { useMemo, useState, useEffect } from 'react';
import type { LibraryData, Album, Song, Artist, PlaybackStats } from '../types/music';
import { PlusIcon, AlbumsIcon, PlayIcon, ShuffleIcon, ArtistsIcon } from '../components/icons/Icons';

interface RecommendedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
  isExternal: true;
}

interface SimilarArtist {
  id: string;
  name: string;
  artworkUrl: string;
  inLibrary: boolean;
}

interface HomePageProps {
  library?: LibraryData;
  onScanFolderClick: () => void;
  onSelectAlbum?: (album: Album) => void;
  onSelectArtist?: (artistName: string) => void;
  onPlaySong?: (song: Song | any, customQueue?: any[]) => void;
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
  onSelectArtist,
  onPlaySong
}: HomePageProps) {
  const hasMusic = library.songs && library.songs.length > 0;
  const greeting = getGreeting();

  const [stats, setStats] = useState<PlaybackStats>({
    songPlayCounts: {},
    artistPlayCounts: {},
    albumPlayCounts: {},
    totalPlays: 0
  });

  const [discoverTracks, setDiscoverTracks] = useState<RecommendedTrack[]>([]);
  const [similarArtists, setSimilarArtists] = useState<SimilarArtist[]>([]);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false);

  // Load persistent offline playback statistics
  useEffect(() => {
    if (window.electronAPI?.getStats) {
      window.electronAPI.getStats().then((data) => {
        if (data) setStats(data);
      });
    }
  }, []);

  // Compute total listening time
  const totalHours = useMemo(() => {
    if (!hasMusic) return "0 mins";
    const totalSeconds = library.songs.reduce((acc, s) => acc + s.duration, 0);
    const hours = totalSeconds / 3600;
    return hours >= 1 ? `${hours.toFixed(1)} hrs` : `${Math.round(totalSeconds / 60)} mins`;
  }, [hasMusic, library.songs]);

  // Sort songs by actual user play count
  const songsByPlayCount = useMemo(() => {
    if (!hasMusic) return [];
    return [...library.songs].sort((a, b) => {
      const countA = stats.songPlayCounts[a.id] || 0;
      const countB = stats.songPlayCounts[b.id] || 0;
      return countB - countA;
    });
  }, [hasMusic, library.songs, stats.songPlayCounts]);

  // Determine top artist based on play counts, falling back to library size
  const topArtistName = useMemo(() => {
    if (!hasMusic) return "Artist";

    const artistEntries = Object.entries(stats.artistPlayCounts);
    if (artistEntries.length > 0) {
      artistEntries.sort((a, b) => b[1] - a[1]);
      const topValid = artistEntries.find(([name]) => !name.toLowerCase().includes('unknown'));
      if (topValid) return topValid[0];
    }

    const validArtists = library.artists.filter((a) => !a.name.toLowerCase().includes('unknown') && a.songCount > 0);
    if (validArtists.length > 0) {
      const sorted = [...validArtists].sort((a, b) => b.songCount - a.songCount);
      return sorted[0].name;
    }

    return library.songs[0].artist;
  }, [hasMusic, stats.artistPlayCounts, library.artists, library.songs]);

  const spotlightArtist = useMemo<Artist | null>(() => {
    if (!library.artists || library.artists.length === 0) return null;
    const found = library.artists.find((a) => a.name.toLowerCase() === topArtistName.toLowerCase());
    return found || library.artists[0] || null;
  }, [library.artists, topArtistName]);

  const spotlightSongs = useMemo<Song[]>(() => {
    if (!spotlightArtist || !hasMusic) return [];
    return library.songs.filter(
      (s) => s.artist.toLowerCase() === spotlightArtist.name.toLowerCase()
    );
  }, [spotlightArtist, hasMusic, library.songs]);

  // Dynamically Generated "Made For You" Mixes
  const recommendedMixes = useMemo<RecommendedMix[]>(() => {
    if (!hasMusic) return [];

    const songs = library.songs;
    const topPlayed = songsByPlayCount.slice(0, 15);
    const topArtistSongs = songs.filter(
      (s) => s.artist.toLowerCase() === topArtistName.toLowerCase()
    );

    const forgottenSongs = songs.filter((s) => (stats.songPlayCounts[s.id] || 0) <= 1).sort(() => 0.5 - Math.random()).slice(0, 15);

    return [
      {
        id: "mix-heavy-rotation",
        title: "Heavy Rotation",
        subtitle: stats.totalPlays > 0 ? "Your most replayed local tracks" : "Based on your library favorites",
        gradient: "linear-gradient(135deg, #fa2d48 0%, #ff5e3a 100%)",
        songs: topPlayed.length > 0 ? topPlayed : songs.slice(0, 12)
      },
      {
        id: "mix-artist-spotlight",
        title: `${topArtistName} Station`,
        subtitle: `Curated collection from your top artist`,
        gradient: "linear-gradient(135deg, #4a72e8 0%, #8844ee 100%)",
        songs: topArtistSongs.length > 0 ? topArtistSongs : songs.slice(0, 12)
      },
      {
        id: "mix-chill",
        title: "Chill & Unwind",
        subtitle: "Laid-back offline listening session",
        gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
        songs: [...songs].reverse().slice(0, 12)
      },
      {
        id: "mix-rediscover",
        title: "Rediscover",
        subtitle: "Tracks you haven't listened to in a while",
        gradient: "linear-gradient(135deg, #f857a6 0%, #ff5858 100%)",
        songs: forgottenSongs.length > 0 ? forgottenSongs : songs.slice().sort(() => 0.5 - Math.random()).slice(0, 12)
      }
    ];
  }, [hasMusic, library.songs, songsByPlayCount, topArtistName, stats]);

  // Fetch online discovery tracks
  useEffect(() => {
    if (!topArtistName || topArtistName.toLowerCase().includes('unknown')) return;

    if (window.electronAPI?.getDiscoverTracks) {
      setIsLoadingDiscovery(true);
      window.electronAPI.getDiscoverTracks(topArtistName)
        .then((tracks: any) => {
          if (tracks && Array.isArray(tracks)) {
            setDiscoverTracks(tracks);
          }
        })
        .finally(() => setIsLoadingDiscovery(false));

      window.electronAPI.getSimilarArtists(topArtistName).then((artists: any) => {
        if (artists && Array.isArray(artists)) {
          setSimilarArtists(artists);
        }
      });
    }
  }, [topArtistName]);

  const handleShuffleLibrary = () => {
    if (!hasMusic || !onPlaySong) return;
    const shuffled = [...library.songs].sort(() => 0.5 - Math.random());
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
      {/* Personalized Hero Banner */}
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
              ? `${library.songs.length} tracks across ${library.albums.length} albums • ${totalHours} of music.`
              : 'Scan your local music folder to start listening offline with rich artwork and synced lyrics.'}
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

        {/* Spotlight Card */}
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
              <span className="spotlight-badge-tag">Top Pick for You</span>
              <h4 className="spotlight-name">{spotlightArtist.name}</h4>
              <p className="spotlight-subtext">
                {spotlightSongs.length} {spotlightSongs.length === 1 ? 'track' : 'tracks'} in collection
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 1. Made For You (Dynamic Mixes Based on Play Counts) */}
      {hasMusic && (
        <section style={{ marginBottom: '38px' }}>
          <div className="section-header">
            <div>
              <h3 className="section-title">Made For You</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Curated mixes based on your listening habits and most-played tracks
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

      {/* 2. Discover Beyond Your Library (Fixed Floating Badge & 100% Width Image) */}
      {hasMusic && (
        <section style={{ marginBottom: '38px' }}>
          <div className="section-header">
            <div>
              <h3 className="section-title">Discover Beyond Your Library</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tracks in similar styles to your top favorites with instant 30s previews
              </p>
            </div>
          </div>

          <div className="grid-cards recommended-mixes-grid">
            {discoverTracks.length > 0 ? (
              discoverTracks.map((track) => (
                <div
                  key={track.id}
                  className="music-card discover-card"
                  onClick={() => onPlaySong?.(track as any)}
                >
                  {/* Container has display: block and position: relative */}
                  <div
                    className="music-card-artwork"
                    style={{
                      position: 'relative',
                      display: 'block',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      overflow: 'hidden',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '12px'
                    }}
                  >
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />

                    {/* Guaranteed Absolute Floating Glass Badge */}
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        zIndex: 10,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(12, 12, 16, 0.78)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        border: '1px solid rgba(255, 255, 255, 0.22)',
                        borderRadius: '4px',
                        padding: '3px 7px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        color: '#ffffff',
                        lineHeight: 1,
                        pointerEvents: 'none',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 10v4M6 6v12M10 3v18M14 7v10M18 5v14M22 10v4" />
                      </svg>
                      Preview
                    </span>

                    <button className="mix-hover-play-btn" title="Preview track" type="button">
                      <PlayIcon size={14} color="#000000" />
                    </button>
                  </div>

                  <div className="music-card-info">
                    <h4>{track.title}</h4>
                    <p>{track.artist} • {track.album}</p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                {isLoadingDiscovery ? "Curating recommendations from your favorite styles..." : "Connect online to discover new tracks tailored to your music."}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Recently Added Albums */}
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