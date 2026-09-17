import React, { useState } from 'react';
import type { Song } from '../../types/music';
import type { RepeatMode } from '../../hooks/useAudioPlayer';
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeIcon,
  ShuffleIcon,
  RepeatIcon,
  QueueIcon,
  SongsIcon
} from '../icons/Icons';

interface NowPlayingBarProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onOpenNowPlaying: () => void;
}

export function NowPlayingBar({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  isShuffle,
  repeatMode,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onOpenNowPlaying
}: NowPlayingBarProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  return (
    <div className="apple-pill-player">
      {/* Left Transport Controls */}

      {/* Center Apple/Myusic Emblem or Active Track Details */}
      <div
        className="pill-center-info"
        onClick={onOpenNowPlaying}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
        title="Open Now Playing"
      >
        {currentSong ? (
          <>
            {currentSong.artworkUrl ? (
              <img
                src={currentSong.artworkUrl}
                alt=""
                style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }}
              />
            ) : (
              <SongsIcon size={18} color="var(--accent-primary)" />
            )}
            <div style={{ textAlign: 'left', overflow: 'hidden', maxWidth: '210px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentSong.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentSong.artist}
              </div>
            </div>
          </>
        ) : (
          <svg className="pill-apple-logo" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        )}
      </div>

      <div className="pill-left-controls">
        <button
          className={`pill-icon-btn ${isShuffle ? 'pill-active-accent' : ''}`}
          onClick={onToggleShuffle}
          title={isShuffle ? "Shuffle On" : "Shuffle Off"}
          type="button"
        >
          <ShuffleIcon size={14} color={isShuffle ? "#fa2d48" : "currentColor"} />
        </button>

        <button className="pill-icon-btn" onClick={onPrev} title="Previous" type="button">
          <SkipBackIcon size={16} />
        </button>

        <button
          className="pill-play-btn"
          type="button"
          onClick={onTogglePlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <PauseIcon size={15} color="#fff" /> : <PlayIcon size={15} color="#fff" />}
        </button>

        <button className="pill-icon-btn" onClick={onNext} title="Next" type="button">
          <SkipForwardIcon size={16} />
        </button>

        <button
          className={`pill-icon-btn ${repeatMode !== 'off' ? 'pill-active-accent' : ''}`}
          onClick={onToggleRepeat}
          title={`Repeat: ${repeatMode}`}
          type="button"
        >
          <RepeatIcon size={14} color={repeatMode !== 'off' ? "#fa2d48" : "currentColor"} />
        </button>
      </div>

      {/* Right Controls */}
      <div className="pill-right-controls">
        <button
          className="pill-icon-btn"
          title="Open Fullscreen Now Playing & Lyrics"
          onClick={onOpenNowPlaying}
          type="button"
        >
          <QueueIcon size={16} />
        </button>

        {/* Volume Wrapper with Hover + Click-to-Toggle and Click-Propagation Prevention */}
        <div
          className="pill-volume-wrapper"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button
            className="pill-icon-btn"
            title="Volume"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowVolumeSlider(!showVolumeSlider);
            }}
          >
            <VolumeIcon size={17} />
          </button>
          {showVolumeSlider && (
            <div className="pill-volume-popover" onClick={(e) => e.stopPropagation()}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="pill-volume-slider"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NowPlayingBar;