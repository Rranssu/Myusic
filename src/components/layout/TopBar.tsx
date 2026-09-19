import React, { useState, useEffect } from 'react';

export function TopBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI?.isWindowMaximized?.().then((max) => {
      setIsMaximized(Boolean(max));
    });
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleMaximize = async () => {
    window.electronAPI?.maximizeWindow?.();
    const max = await window.electronAPI?.isWindowMaximized?.();
    setIsMaximized(Boolean(max));
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow?.();
  };

  return (
    <header className="app-topbar-custom">
      {/* Right: Window Control Buttons (Minimize, Maximize, Close) */}
      <div className="window-controls-group">
        <button
          className="win-control-btn minimize-btn"
          onClick={handleMinimize}
          title="Minimize"
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>

        <button
          className="win-control-btn maximize-btn"
          onClick={handleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
          type="button"
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="3.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3.5 3.5V2h6.5v6.5h-1.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>

        <button
          className="win-control-btn close-btn"
          onClick={handleClose}
          title="Close"
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default TopBar;