import { useState, useEffect, useMemo } from 'react';
import type { LibraryData, PlaybackStats, Song } from '../types/music';
import { AlbumsIcon, ArtistsIcon } from '../components/icons/Icons';

interface StatisticsPageProps {
  library: LibraryData;
}

export function StatisticsPage({ library }: StatisticsPageProps) {
  const [stats, setStats] = useState<PlaybackStats>({
    songPlayCounts: {},
    artistPlayCounts: {},
    albumPlayCounts: {},
    totalPlays: 0,
    dailyHistory: {}
  });

  useEffect(() => {
    if (window.electronAPI?.getStats) {
      window.electronAPI.getStats().then((data) => {
        if (data) setStats(data);
      });
    }
  }, []);

  // Top 10 Songs with Artwork Thumbnails
  const topSongs = useMemo(() => {
    return Object.entries(stats.songPlayCounts || {})
      .map(([id, count]) => {
        const song = library.songs.find((s) => s.id === id);
        return { song, count };
      })
      .filter((item): item is { song: Song; count: number } => Boolean(item.song))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [stats.songPlayCounts, library.songs]);

  // Top 10 Artists with Artwork Avatars
  const topArtists = useMemo(() => {
    return Object.entries(stats.artistPlayCounts || {})
      .map(([name, count]) => {
        const artistObj = library.artists.find((a) => a.name.toLowerCase() === name.toLowerCase());
        return { name, count, artworkUrl: artistObj?.artworkUrl };
      })
      .filter((item) => !item.name.toLowerCase().includes('unknown'))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [stats.artistPlayCounts, library.artists]);

  // 7-Day Chart Data Points
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: 'short' });
      const plays = stats.dailyHistory?.[dateStr] || 0;
      days.unshift({ label, plays });
    }
    return days.reverse();
  }, [stats.dailyHistory]);

  const maxPlays = Math.max(...chartData.map((d) => d.plays), 5);

  // Smooth Cubic Bezier SVG path generator
  const svgPoints = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1)) * 500;
    const y = 180 - (d.plays / maxPlays) * 140;
    return { x, y };
  });

  const bezierPath = svgPoints.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpX2 = prev.x + (pt.x - prev.x) / 2;
    return `${acc} C ${cpX1},${prev.y} ${cpX2},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  return (
    <div className="statistics-page">
      <div className="stats-page-header">
        <h1 className="stats-page-title">Listening Insights</h1>
        <p className="stats-page-subtitle">Your personalized audio analytics and recommendation telemetry</p>
      </div>

      {/* Bento-Box Grid Overview */}
      <div className="stats-bento-grid">
        <div className="bento-card bento-hero">
          <span className="bento-label">Total Play Count</span>
          <div className="bento-big-number">{stats.totalPlays || 0}</div>
          <span className="bento-subtext">Tracks listened to across your offline library</span>
        </div>

        <div className="bento-card bento-stat">
          <span className="bento-label">Indexed Library</span>
          <div className="bento-medium-number">{library.songs.length}</div>
          <span className="bento-subtext">High-fidelity audio files</span>
        </div>

        <div className="bento-card bento-stat">
          <span className="bento-label">Artists Catalog</span>
          <div className="bento-medium-number">{library.artists.length}</div>
          <span className="bento-subtext">Organized discographies</span>
        </div>
      </div>

      {/* Apple Music Replay Style 7-Day Trend Card */}
      <div className="replay-chart-card">
        <div className="chart-title-row">
          <h3 className="leaderboard-heading">7-Day Listening Trend</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily playback activity</span>
        </div>

        <div className="chart-svg-viewport">
          <svg viewBox="0 0 500 200" width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <linearGradient id="replayGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle Horizontal Guide Lines */}
            <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="0" y1="180" x2="500" y2="180" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            {/* Smooth Filled Area */}
            <path d={`${bezierPath} L 500,180 L 0,180 Z`} fill="url(#replayGradient)" />

            {/* Smooth Spline Line */}
            <path d={bezierPath} fill="none" stroke="var(--accent-primary)" strokeWidth="3.5" strokeLinecap="round" />

            {/* Data Points */}
            {svgPoints.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="4.5" fill="#ffffff" stroke="var(--accent-primary)" strokeWidth="2.5" />
            ))}
          </svg>
        </div>

        {/* X-Axis Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {chartData.map((d, i) => (
            <span key={i}>{d.label} ({d.plays})</span>
          ))}
        </div>
      </div>

      {/* Split Leaderboards (Top Songs & Top Artists with Thumbnails) */}
      <div className="replay-split-grid">
        {/* Top 10 Songs */}
        <div className="leaderboard-column">
          <h3 className="leaderboard-heading">Top Songs</h3>
          <div className="leaderboard-list">
            {topSongs.length > 0 ? (
              topSongs.map(({ song, count }, idx) => (
                <div key={song.id} className="leaderboard-row">
                  <span className="leaderboard-rank">{idx + 1}</span>
                  <div className="leaderboard-thumb">
                    {song.artworkUrl ? (
                      <img src={song.artworkUrl} alt="" />
                    ) : (
                      <div className="leaderboard-thumb-placeholder">
                        <AlbumsIcon size={16} color="rgba(255,255,255,0.4)" />
                      </div>
                    )}
                  </div>
                  <div className="leaderboard-item-meta">
                    <div className="leaderboard-item-title">{song.title}</div>
                    <div className="leaderboard-item-sub">{song.artist}</div>
                  </div>
                  <span className="leaderboard-count-pill">{count} plays</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '20px 0', textAlign: 'center' }}>
                No song play history recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* Top 10 Artists */}
        <div className="leaderboard-column">
          <h3 className="leaderboard-heading">Top Artists</h3>
          <div className="leaderboard-list">
            {topArtists.length > 0 ? (
              topArtists.map(({ name, count, artworkUrl }, idx) => (
                <div key={name} className="leaderboard-row">
                  <span className="leaderboard-rank">{idx + 1}</span>
                  <div className="leaderboard-thumb artist-avatar">
                    {artworkUrl ? (
                      <img src={artworkUrl} alt={name} />
                    ) : (
                      <div className="leaderboard-thumb-placeholder">
                        <ArtistsIcon size={16} color="rgba(255,255,255,0.4)" />
                      </div>
                    )}
                  </div>
                  <div className="leaderboard-item-meta">
                    <div className="leaderboard-item-title">{name}</div>
                    <div className="leaderboard-item-sub">Top frequent artist</div>
                  </div>
                  <span className="leaderboard-count-pill">{count} plays</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '20px 0', textAlign: 'center' }}>
                No artist play history recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Engine Telemetry Pane */}
      <div className="telemetry-pane">
        <h3 className="leaderboard-heading">Recommendation Engine Telemetry</h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '-12px' }}>
          Diagnostic telemetry demonstrating offline cache storage and Deezer Graph synchronization
        </p>

        <div className="telemetry-grid-modern">
          <div className="telemetry-cell">
            <span className="telemetry-key-title">Engine State</span>
            <span className="telemetry-val-body">
              <span className="pulse-dot" /> Active & Offline Ready
            </span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-key-title">Music Graph</span>
            <span className="telemetry-val-body">Deezer Graph API (Keyless)</span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-key-title">Lyrics Stream</span>
            <span className="telemetry-val-body">LRCLIB Synced (.lrc) & Plain</span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-key-title">Cache Storage</span>
            <span className="telemetry-val-body" style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
              userData/myusic/
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsPage;