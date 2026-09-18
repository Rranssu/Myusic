import { useState, useEffect } from 'react';
import type { Palette } from '../../utils/colorExtractor';

interface GlobalAuroraProps {
  activeThemeSource: string | null;
  palette: Palette;
}

export function GlobalAurora({ activeThemeSource, palette }: GlobalAuroraProps) {
  const [buffer, setBuffer] = useState<{
    current: Palette;
    previous: Palette | null;
    key: number;
  }>({
    current: palette,
    previous: null,
    key: 0
  });

  useEffect(() => {
    setBuffer((prev) => ({
      previous: prev.current,
      current: palette,
      key: prev.key + 1
    }));
  }, [palette.primary, palette.secondary]);

  if (!activeThemeSource) return null;

  const { current, previous, key } = buffer;

  return (
    <div className="global-aurora-container">
      {/* Previous Layer (Fading Out) */}
      {previous && (
        <div key={`glob-prev-${key}`} className="aurora-layer fade-out">
          <div
            className="global-aurora-orb orb-1"
            style={{ background: `radial-gradient(circle, ${previous.glowPrimary} 0%, transparent 65%)` }}
          />
          <div
            className="global-aurora-orb orb-2"
            style={{ background: `radial-gradient(circle, ${previous.glowSecondary} 0%, transparent 65%)` }}
          />
          <div
            className="global-aurora-orb orb-3"
            style={{ background: `radial-gradient(circle, ${previous.glowPrimary} 0%, transparent 65%)` }}
          />
        </div>
      )}

      {/* Current Layer (Fading In) */}
      <div key={`glob-curr-${key}`} className="aurora-layer fade-in">
        <div
          className="global-aurora-orb orb-1"
          style={{ background: `radial-gradient(circle, ${current.glowPrimary} 0%, transparent 65%)` }}
        />
        <div
          className="global-aurora-orb orb-2"
          style={{ background: `radial-gradient(circle, ${current.glowSecondary} 0%, transparent 65%)` }}
        />
        <div
          className="global-aurora-orb orb-3"
          style={{ background: `radial-gradient(circle, ${current.glowPrimary} 0%, transparent 65%)` }}
        />
      </div>
    </div>
  );
}

export default GlobalAurora;