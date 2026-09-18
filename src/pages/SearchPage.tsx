import React, { useState, useEffect, useMemo } from 'react';
import type { LibraryData, Song, Album, Artist } from '../types/music';
import { SearchIcon, SongsIcon, AlbumsIcon, ArtistsIcon, PlayIcon } from '../components/icons/Icons';

interface SearchPageProps {
  library: LibraryData;
  onPlaySong?: (song: Song, queue?: Song[]) => void;
  onSelectAlbum?: (album: Album) => void;
  onSelectArtist?: (artist: Artist) => void;
}

type SearchScope = 'library' | 'online';

const GENRE_CATEGORIES = [
  { id: 'pop', name: 'Pop', color: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)' },
  { id: 'hiphop', name: 'Hip-Hop', color: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)' },
  { id: 'electronic', name: 'Electronic', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'rock', name: 'Rock', color: 'linear-gradient(135deg, #434343 0%, #000000 100%)' },
  { id: 'rnb', name: 'R&B & Soul', color: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)' },
  { id: 'kpop', name: 'K-Pop', color: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)' },
  { id: 'indie', name: 'Indie & Alt', color: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { id: 'ambient', name: 'Ambient & Lo-Fi', color: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)' }
];

export function SearchPage({ library, onPlaySong, onSelectAlbum, onSelectArtist }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('library');
  const [onlineResults, setOnlineResults] = useState<Song[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Filter local library results
  const localResults = useMemo(() => {
    if (!query.trim()) return { songs: [], albums: [], artists: [] };
    const q = query.toLowerCase();

    return {
      songs: library.songs.filter(
        (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.album.toLowerCase().includes(q)
      ),
      albums: library.albums.filter(
        (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
      ),
      artists: library.artists.filter(
        (ar) => ar.name.toLowerCase().includes(q)
      )
    };
  }, [query, library]);

  // Fetch online streaming results when in 'online' mode
  useEffect(() => {
    if (scope === 'online' && query.trim().length > 1) {
      setIsSearchingOnline(true);
      const timer = setTimeout(() => {
        window.electronAPI?.searchOnline?.(query).then((results) => {
          setOnlineResults(results || []);
          setIsSearchingOnline(false);
        });
      }, 350); // Debounce search
      return () => clearTimeout(timer);
    } else {
      setOnlineResults([]);
    }
  }, [query, scope]);

  const hasLocalResults = localResults.songs.length > 0 || localResults.albums.length > 0 || localResults.artists.length > 0;

  return (
    <div className="search-page">
      <div className="search-header-container">
        <h2 className="section-title">Search</h2>
        <div className="search-input-large-wrapper">
          <SearchIcon size={20} color="var(--text-secondary)" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={scope === 'library' ? "Search local songs, artists, albums..." : "Search Myusic Online catalog..."}
            autoFocus
          />
        </div>

        <div className="search-scope-switcher">
          <button
            className={`scope-pill ${scope === 'library' ? 'active' : ''}`}
            onClick={() => setScope('library')}
            type="button"
          >
            Library
          </button>
          <button
            className={`scope-pill ${scope === 'online' ? 'active' : ''}`}
            onClick={() => setScope('online')}
            type="button"
          >
            Myusic Online
          </button>
        </div>
      </div>

      {/* Genre Categories */}
      {!query.trim() && (
        <section style={{ marginTop: '12px' }}>
          <h3 className="section-title" style={{ marginBottom: '18px' }}>Browse Categories</h3>
          <div className="genres-grid">
            {GENRE_CATEGORIES.map((genre) => (
              <div
                key={genre.id}
                className="genre-card"
                style={{ background: genre.color }}
                onClick={() => setQuery(genre.name)}
              >
                <h4>{genre.name}</h4>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Local Library Search Results */}
      {query.trim() && scope === 'library' && (
        <div className="search-results-container">
          {!hasLocalResults ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>No local library results found for "{query}". Switch to "Myusic Online" to search the cloud.</p>
            </div>
          ) : (
            <>
              {localResults.songs.length > 0 && (
                <div className="search-results-section">
                  <h3 className="section-title">Songs</h3>
                  <div className="songs-list">
                    {localResults.songs.map((song) => (
                      <div
                        key={song.id}
                        className="song-row"
                        onDoubleClick={() => onPlaySong?.(song, localResults.songs)}
                      >
                        <div className="col-num">
                          <button
                            className="row-play-btn"
                            style={{ display: 'block' }}
                            onClick={() => onPlaySong?.(song, localResults.songs)}
                            type="button"
                          >
                            <PlayIcon size={12} color="#ffffff" />
                          </button>
                        </div>
                        <div className="col-title song-title-cell">
                          {song.artworkUrl ? (
                            <img src={song.artworkUrl} alt="" className="song-row-thumb" />
                          ) : (
                            <div className="song-row-thumb placeholder">
                              <SongsIcon size={14} color="rgba(255,255,255,0.4)" />
                            </div>
                          )}
                          <span className="song-name-text">{song.title}</span>
                        </div>
                        <span className="col-artist">{song.artist}</span>
                        <span className="col-album">{song.album}</span>
                        <span className="col-time">{Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {localResults.albums.length > 0 && (
                <div className="search-results-section">
                  <h3 className="section-title">Albums</h3>
                  <div className="grid-cards">
                    {localResults.albums.map((album) => (
                      <div key={album.id} className="music-card" onClick={() => onSelectAlbum?.(album)}>
                        <div className="music-card-artwork">
                          {album.artworkUrl ? <img src={album.artworkUrl} alt="" /> : <AlbumsIcon size={44} color="#353542" />}
                        </div>
                        <div className="music-card-info">
                          <h4>{album.title}</h4>
                          <p>{album.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {localResults.artists.length > 0 && (
                <div className="search-results-section">
                  <h3 className="section-title">Artists</h3>
                  <div className="grid-cards">
                    {localResults.artists.map((artist) => (
                      <div key={artist.id} className="music-card artist-card" onClick={() => onSelectArtist?.(artist)}>
                        <div className="music-card-artwork artist-avatar">
                          {artist.artworkUrl ? <img src={artist.artworkUrl} alt="" /> : <ArtistsIcon size={42} color="rgba(255,255,255,0.3)" />}
                        </div>
                        <div className="music-card-info" style={{ textAlign: 'center' }}>
                          <h4>{artist.name}</h4>
                          <p>{artist.albumCount} albums</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Myusic Online Streaming Results */}
      {query.trim() && scope === 'online' && (
        <div className="search-results-container">
          <div className="search-results-section">
            <h3 className="section-title">
              {isSearchingOnline ? "Searching Myusic Online..." : `Cloud Results for "${query}"`}
            </h3>

            {isSearchingOnline ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>Querying cloud catalog...</p>
              </div>
            ) : onlineResults.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No streaming results found.</p>
              </div>
            ) : (
              <div className="songs-list">
                {onlineResults.map((song) => (
                  <div
                    key={song.id}
                    className="song-row"
                    onDoubleClick={() => onPlaySong?.(song, onlineResults)}
                  >
                    <div className="col-num">
                      <button
                        className="row-play-btn"
                        style={{ display: 'block' }}
                        onClick={() => onPlaySong?.(song, onlineResults)}
                        type="button"
                      >
                        <PlayIcon size={12} color="#ffffff" />
                      </button>
                    </div>
                    <div className="col-title song-title-cell">
                      {song.artworkUrl ? (
                        <img src={song.artworkUrl} alt="" className="song-row-thumb" />
                      ) : (
                        <div className="song-row-thumb placeholder">
                          <SongsIcon size={14} color="rgba(255,255,255,0.4)" />
                        </div>
                      )}
                      <span className="song-name-text">{song.title}</span>
                    </div>
                    <span className="col-artist">{song.artist}</span>
                    <span className="col-album">{song.album}</span>
                    <span className="col-time">{Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchPage;