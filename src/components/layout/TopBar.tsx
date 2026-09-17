import React from 'react';
import { SearchIcon } from '../icons/Icons';

export function TopBar() {
  return (
    <header className="app-topbar">
      <div className="search-box">
        <SearchIcon size={16} color="#5e5e66" />
        <input
          type="text"
          placeholder="Search songs, artists, albums..."
        />
      </div>
    </header>
  );
}

export default TopBar;