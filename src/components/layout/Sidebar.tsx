import type { NavigationTab, Playlist } from '../../types/music';
import {
  HomeIcon,
  SearchIcon,
  SongsIcon,
  AlbumsIcon,
  ArtistsIcon,
  PlaylistIcon,
  PlusIcon,
  SidebarToggleIcon,
  SettingsIcon
} from '../icons/Icons';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCompact: boolean;
  onToggleCompact: () => void;
  playlists: Playlist[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenNewPlaylistModal: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  isCompact,
  onToggleCompact,
  playlists,
  onSelectPlaylist,
  onOpenNewPlaylistModal
}: SidebarProps) {
  return (
    <aside className={`app-sidebar ${isCompact ? 'compact' : ''}`}>
      {/* Header: Brand and Compact Toggle Button Beside 'Myusic' */}
      <div className="sidebar-header">
        {!isCompact ? (
          <>
            <div className="brand">
              <svg className="brand-logo" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
              <h1 className="brand-title">Myusic</h1>
            </div>
            <button
              className="sidebar-toggle-btn"
              onClick={onToggleCompact}
              title="Collapse Sidebar"
              type="button"
            >
              <SidebarToggleIcon size={18} />
            </button>
          </>
        ) : (
          <button
            className="sidebar-toggle-btn"
            onClick={onToggleCompact}
            title="Expand Sidebar"
            type="button"
          >
            <SidebarToggleIcon size={18} />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div className="nav-section">
        {!isCompact && <div className="nav-group-title">Menu</div>}
        <ul className="nav-list">
          <li
            className={`nav-item ${currentTab === 'search' ? 'active' : ''}`}
            onClick={() => onSelectTab('search')}
            title="Search"
          >
            <SearchIcon size={18} />
            {!isCompact && <span>Search</span>}
          </li>
          <li
            className={`nav-item ${currentTab === 'home' ? 'active' : ''}`}
            onClick={() => onSelectTab('home')}
            title="Home"
          >
            <HomeIcon size={18} />
            {!isCompact && <span>Home</span>}
          </li>
        </ul>
      </div>

      {/* Library Section */}
      <div className="nav-section">
        {!isCompact && <div className="nav-group-title">Library</div>}
        <ul className="nav-list">
          <li
            className={`nav-item ${currentTab === 'songs' ? 'active' : ''}`}
            onClick={() => onSelectTab('songs')}
            title="Songs"
          >
            <SongsIcon size={18} />
            {!isCompact && <span>Songs</span>}
          </li>
          <li
            className={`nav-item ${currentTab === 'albums' ? 'active' : ''}`}
            onClick={() => onSelectTab('albums')}
            title="Albums"
          >
            <AlbumsIcon size={18} />
            {!isCompact && <span>Albums</span>}
          </li>
          <li
            className={`nav-item ${currentTab === 'artists' ? 'active' : ''}`}
            onClick={() => onSelectTab('artists')}
            title="Artists"
          >
            <ArtistsIcon size={18} />
            {!isCompact && <span>Artists</span>}
          </li>
        </ul>
      </div>

      {/* Playlists Section */}
      <div className="nav-section playlist-section">
        {!isCompact && <div className="nav-group-title">Playlists</div>}
        <ul className="nav-list">
          <li
            className={`nav-item ${currentTab === 'playlists' ? 'active' : ''}`}
            onClick={() => onSelectTab('playlists')}
            title="All Playlists"
          >
            <PlaylistIcon size={18} />
            {!isCompact && <span>All Playlists</span>}
          </li>

          {/* Real Dynamic Playlists */}
          {playlists.map((pl) => (
            <li
              key={pl.id}
              className="nav-item playlist-item"
              onClick={() => onSelectPlaylist(pl)}
              title={pl.name}
            >
              <div
                className="playlist-mini-thumb"
                style={{ backgroundColor: pl.coverColor || "var(--accent-primary)" }}
              >
                {pl.name.charAt(0).toUpperCase()}
              </div>
              {!isCompact && <span className="playlist-name-text">{pl.name}</span>}
            </li>
          ))}

          <li
            className="nav-item new-playlist-btn"
            onClick={onOpenNewPlaylistModal}
            title="New Playlist"
          >
            <PlusIcon size={16} />
            {!isCompact && <span>New Playlist</span>}
          </li>
        </ul>
      </div>

      {/* Bottom Pinned Settings Footer */}
      <div className="sidebar-footer">
        <ul className="nav-list">
          <li
            className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => onSelectTab('settings')}
            title="Settings"
          >
            <SettingsIcon size={18} />
            {!isCompact && <span>Settings</span>}
          </li>
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;