import { useState, useEffect, useRef } from 'react';
import type { Song, LyricsData } from '../../types/music';
import type { RepeatMode } from '../../hooks/useAudioPlayer';
import { extractPaletteFromImage, type Palette } from '../../utils/colorExtractor';
import {
  ChevronDownIcon,
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeIcon,
  LyricsIcon,
  QueueIcon,
  StarIcon,
  MoreHorizontalIcon,
  AlbumsIcon
} from '../icons/Icons';

type SidePanel = 'lyrics' | 'queue' | 'none';

interface NowPlayingScreenProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  queueIndex: number;
  onPlaySong: (song: Song, queueList?: Song[]) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
}

function formatDuration(sec: number): string {
  if (isNaN(sec) || !isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getAudioBadge(filePath?: string): string {
  if (!filePath) return "Lossless";
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'flac':
    case 'wav':
    case 'alac':
      return "Lossless";
    case 'm4a':
    case 'aac':
      return "AAC";
    case 'mp3':
      return "MP3";
    case 'ogg':
    case 'opus':
      return "Ogg";
    default:
      return "Lossless";
  }
}

export function NowPlayingScreen({
  isOpen,
  onClose,
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  queue,
  queueIndex,
  onPlaySong,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
}: NowPlayingScreenProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Lyrics State
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);

  const [palette, setPalette] = useState<Palette>({
    primary: "rgb(250, 45, 72)",
    secondary: "rgb(110, 60, 230)",
    accent: "#fa2d48",
    glowPrimary: "rgba(250, 45, 72, 0.75)",
    glowSecondary: "rgba(110, 60, 230, 0.65)"
  });

  // Reset video error state whenever song or animated URL changes
  useEffect(() => {
    setVideoError(false);
  }, [currentSong?.id, currentSong?.animatedArtworkUrl]);

  // Color Palette Extraction
  useEffect(() => {
    if (currentSong?.artworkUrl) {
      extractPaletteFromImage(currentSong.artworkUrl).then((p) => {
        setPalette(p);
      });
    }
  }, [currentSong?.id, currentSong?.artworkUrl]);

  // Fetch or Load Cached Lyrics
  useEffect(() => {
    if (!currentSong) {
      setLyrics(null);
      return;
    }

    if (window.electronAPI?.getLyrics) {
      window.electronAPI.getLyrics(currentSong).then((data) => {
        setLyrics(data);
        if ((!data || data.lines.length === 0) && sidePanel === 'lyrics') {
          setSidePanel('none');
        }
      });
    }
  }, [currentSong?.id]);

  // Auto-scroll active lyric line smoothly into view
  useEffect(() => {
    if (sidePanel === 'lyrics' && lyrics?.isSynced && activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentTime, sidePanel, lyrics?.isSynced]);

  if (!isOpen) return null;

  const effectiveDuration = duration > 0 ? duration : (currentSong?.duration || 0);
  const progressPercent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0;
  const remainingTime = effectiveDuration > currentTime ? effectiveDuration - currentTime : 0;
  const qualityBadge = getAudioBadge(currentSong?.filePath);

  const hasLyrics = lyrics !== null && lyrics.lines && lyrics.lines.length > 0;
  const animatedUrl = currentSong?.animatedArtworkUrl;

  const handleToggleLyrics = () => {
    if (!hasLyrics) return;
    setSidePanel((prev) => (prev === 'lyrics' ? 'none' : 'lyrics'));
  };

  const handleToggleQueue = () => {
    setSidePanel((prev) => (prev === 'queue' ? 'none' : 'queue'));
  };

  const upcomingQueue = queue.slice(queueIndex + 1);

  let activeLyricIndex = -1;
  if (lyrics?.isSynced && lyrics.lines) {
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (currentTime >= lyrics.lines[i].time) {
        activeLyricIndex = i;
      } else {
        break;
      }
    }
  }

  return (
    <div
      className="now-playing-overlay"
      style={{
        background: `radial-gradient(circle at 25% 35%, ${palette.glowPrimary} 0%, transparent 60%),
                     radial-gradient(circle at 75% 65%, ${palette.glowSecondary} 0%, transparent 60%),
                     #09090d`
      }}
    >
      {/* Aurora Mesh */}
      <div className="aurora-container">
        <div
          className="aurora-orb orb-1"
          style={{ background: `radial-gradient(circle, ${palette.glowPrimary} 0%, transparent 65%)` }}
        />
        <div
          className="aurora-orb orb-2"
          style={{ background: `radial-gradient(circle, ${palette.glowSecondary} 0%, transparent 65%)` }}
        />
        <div
          className="aurora-orb orb-3"
          style={{ background: `radial-gradient(circle, ${palette.glowPrimary} 0%, transparent 65%)` }}
        />
      </div>

      {/* Top Bar Navigation */}
      <header className="now-playing-topbar">
        <button className="now-playing-collapse-btn" onClick={onClose} title="Collapse" type="button">
          <ChevronDownIcon size={24} color="#ffffff" />
        </button>

        {/* Top Right Queue Button */}
        <button
          className={`now-playing-top-queue-btn ${sidePanel === 'queue' ? 'active' : ''}`}
          onClick={handleToggleQueue}
          title={sidePanel === 'queue' ? "Hide Queue" : "View Queue"}
          type="button"
          style={sidePanel === 'queue' ? { backgroundColor: palette.glowPrimary, borderColor: palette.accent } : undefined}
        >
          <QueueIcon size={18} color="#ffffff" />
        </button>
      </header>

      {/* Main Body */}
      <div className={`now-playing-body ${sidePanel === 'none' ? 'centered-mode' : ''}`}>
        {/* Left / Center Player Hub */}
        <div className="now-playing-left">
          <div
            className="now-playing-artwork-card"
            style={{
              position: 'relative',
              boxShadow: `0 24px 60px -10px rgba(0, 0, 0, 0.8), 0 0 40px ${palette.glowPrimary}`
            }}
          >
            {/* Animated Loop Artwork (Matching AlbumDetailPage working pattern) */}
            {animatedUrl && !videoError ? (
              <video
                key={animatedUrl}
                src={animatedUrl}
                poster={currentSong?.artworkUrl}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={() => setVideoError(true)}
              />
            ) : currentSong?.artworkUrl ? (
              <img
                src={currentSong.artworkUrl}
                alt={currentSong.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <AlbumsIcon size={100} color="rgba(255, 255, 255, 0.3)" />
            )}
          </div>

          <div className="now-playing-track-details centered-meta">
            {/* Centered Info & Quality Badge */}
            <div className="track-header-column">
              {currentSong && (
                <span className="audio-quality-badge-top">{qualityBadge}</span>
              )}

              <h1 className="now-playing-title-centered">
                {currentSong?.title || "No Track Playing"}
              </h1>

              <p className="now-playing-artist-centered">
                {currentSong ? `${currentSong.artist} — ${currentSong.album}` : "Select a track to start"}
              </p>
            </div>

            {/* Interactive Scrubber Bar */}
            <div className="now-playing-scrubber-group">
              <div
                className="now-playing-scrubber-bar"
                onClick={(e) => {
                  if (effectiveDuration <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  onSeek(pct * effectiveDuration);
                }}
              >
                <div
                  className="now-playing-scrubber-fill"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: "#ffffff",
                    boxShadow: `0 0 12px ${palette.accent}`
                  }}
                />
              </div>
              <div className="now-playing-timestamps">
                <span>{formatDuration(currentTime)}</span>
                <span>-{formatDuration(remainingTime)}</span>
              </div>
            </div>

            {/* 5-Button Transport Bar */}
            <div className="now-playing-transport">
              {/* 1. Volume Button with Popover */}
              <div
                className="transport-volume-wrapper"
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
                  <VolumeIcon size={18} color="rgba(255, 255, 255, 0.85)" />
                </button>
                {showVolumeSlider && (
                  <div
                    className="transport-volume-popover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="pill-volume-slider"
                      style={{ accentColor: palette.accent }}
                    />
                  </div>
                )}
              </div>

              {/* 2. Previous */}
              <button className="pill-icon-btn" onClick={onPrev} title="Previous" type="button">
                <SkipBackIcon size={24} color="#ffffff" />
              </button>

              {/* 3. Play / Pause */}
              <button
                className="now-playing-main-play-btn"
                onClick={onTogglePlay}
                title={isPlaying ? "Pause" : "Play"}
                type="button"
              >
                {isPlaying ? <PauseIcon size={24} color="#ffffff" /> : <PlayIcon size={24} color="#ffffff" />}
              </button>

              {/* 4. Next */}
              <button className="pill-icon-btn" onClick={onNext} title="Next" type="button">
                <SkipForwardIcon size={24} color="#ffffff" />
              </button>

              {/* 5. Lyrics Toggle */}
              <button
                className={`pill-icon-btn ${sidePanel === 'lyrics' ? 'pill-active-accent' : ''} ${!hasLyrics ? 'lyrics-btn-disabled' : ''}`}
                onClick={handleToggleLyrics}
                disabled={!hasLyrics}
                title={
                  !hasLyrics
                    ? "Lyrics unavailable for this track"
                    : sidePanel === 'lyrics'
                    ? "Hide Lyrics (Center Mode)"
                    : "Show Lyrics"
                }
                type="button"
              >
                <LyricsIcon
                  size={19}
                  color={
                    !hasLyrics
                      ? "rgba(255, 255, 255, 0.25)"
                      : sidePanel === 'lyrics'
                      ? palette.accent
                      : "rgba(255, 255, 255, 0.85)"
                  }
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Panel: Lyrics */}
        {sidePanel === 'lyrics' && hasLyrics && (
          <div className="now-playing-right">
            <div className="lyrics-stream">
              {lyrics.isSynced ? (
                lyrics.lines.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  const isPassed = idx < activeLyricIndex;

                  return (
                    <p
                      key={`${line.time}-${idx}`}
                      ref={isActive ? activeLyricRef : null}
                      className={`lyric-line ${isActive ? 'active' : isPassed ? 'passed' : 'upcoming'}`}
                      onClick={() => onSeek(line.time)}
                      style={
                        isActive
                          ? { textShadow: `0 4px 28px ${palette.glowPrimary}` }
                          : undefined
                      }
                      title={`Jump to ${formatDuration(line.time)}`}
                    >
                      {line.text}
                    </p>
                  );
                })
              ) : (
                lyrics.lines.map((line, idx) => (
                  <p key={idx} className="lyric-line unsynced-line">
                    {line.text}
                  </p>
                ))
              )}
            </div>
          </div>
        )}

        {/* Right Side Panel: Queue View */}
        {sidePanel === 'queue' && (
          <div className="now-playing-right queue-panel">
            <div className="queue-header-row">
              <h3 className="queue-panel-title">Queue</h3>
              <span className="queue-panel-count">
                {upcomingQueue.length} {upcomingQueue.length === 1 ? 'track' : 'tracks'} upcoming
              </span>
            </div>

            <div className="queue-track-list">
              {upcomingQueue.length > 0 ? (
                upcomingQueue.map((song, i) => (
                  <div
                    key={`${song.id}-${i}`}
                    className="queue-item-row"
                    onClick={() => onPlaySong(song, queue)}
                  >
                    <div className="queue-thumb-wrap">
                      {song.artworkUrl ? (
                        <img src={song.artworkUrl} alt="" className="queue-thumb" />
                      ) : (
                        <div className="queue-thumb placeholder">
                          <AlbumsIcon size={18} color="rgba(255,255,255,0.4)" />
                        </div>
                      )}
                      <div className="queue-play-overlay">
                        <PlayIcon size={12} color="#ffffff" />
                      </div>
                    </div>

                    <div className="queue-item-info">
                      <div className="queue-item-title">{song.title}</div>
                      <div className="queue-item-artist">{song.artist} — {song.album}</div>
                    </div>

                    <button className="pill-icon-btn" title="Options" type="button" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontalIcon size={16} color="rgba(255,255,255,0.5)" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="queue-empty-message">
                  No upcoming tracks in the current queue.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NowPlayingScreen;