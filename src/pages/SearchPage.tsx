import { SearchIcon } from '../components/icons/Icons';

export function SearchPage() {
  return (
    <div className="search-page">
      <h2 className="section-title">Search</h2>
      <div className="search-input-large-wrapper">
        <SearchIcon size={20} color="var(--text-secondary)" />
        <input
          type="text"
          placeholder="Artists, Songs, Lyrics, and more"
          autoFocus
        />
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>
        Type to search across your indexed local tracks, artists, and albums.
      </p>
    </div>
  );
}

export default SearchPage;