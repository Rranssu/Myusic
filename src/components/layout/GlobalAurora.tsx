import type { Palette } from '../../utils/colorExtractor';

interface GlobalAuroraProps {
  activeThemeSource: string | null;
  palette: Palette;
}

export function GlobalAurora({ activeThemeSource, palette }: GlobalAuroraProps) {
  if (!activeThemeSource) return null;

  return (
    <div className="global-aurora-container">
      <div
        className="global-aurora-orb orb-1"
        style={{ background: `radial-gradient(circle, ${palette.glowPrimary} 0%, transparent 65%)` }}
      />
      <div
        className="global-aurora-orb orb-2"
        style={{ background: `radial-gradient(circle, ${palette.glowSecondary} 0%, transparent 65%)` }}
      />
      <div
        className="global-aurora-orb orb-3"
        style={{ background: `radial-gradient(circle, ${palette.glowPrimary} 0%, transparent 65%)` }}
      />
    </div>
  );
}

export default GlobalAurora;