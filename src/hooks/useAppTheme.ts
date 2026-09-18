import { useState, useEffect } from 'react';
import type { Album, Artist, Song } from '../types/music';
import { extractPaletteFromImage, type Palette } from '../utils/colorExtractor';

const DEFAULT_PALETTE: Palette = {
  primary: "rgb(250, 45, 72)",
  secondary: "rgb(110, 60, 230)",
  accent: "#fa2d48",
  glowPrimary: "rgba(250, 45, 72, 0.45)",
  glowSecondary: "rgba(110, 60, 230, 0.35)"
};

interface UseAppThemeProps {
  selectedAlbum: Album | null;
  selectedArtist: Artist | null;
  activeSong: Song | null;
}

export function useAppTheme({ selectedAlbum, selectedArtist, activeSong }: UseAppThemeProps) {
  const [appPalette, setAppPalette] = useState<Palette>(DEFAULT_PALETTE);

  // Hierarchy: 1. Album Detail > 2. Artist Detail > 3. Playing Song > 4. Default
  const activeThemeSource =
    selectedAlbum?.artworkUrl ||
    selectedArtist?.artworkUrl ||
    activeSong?.artworkUrl ||
    null;

  useEffect(() => {
    if (activeThemeSource) {
      extractPaletteFromImage(activeThemeSource).then((p) => {
        setAppPalette(p);

        // Morph full window background
        document.documentElement.style.setProperty(
          '--bg-app',
          `radial-gradient(circle at 18% 22%, ${p.glowPrimary} 0%, transparent 60%),
           radial-gradient(circle at 82% 78%, ${p.glowSecondary} 0%, transparent 60%),
           rgba(10, 10, 14, 0.72)`
        );

        // Tint sidebar with secondary hue
        document.documentElement.style.setProperty(
          '--bg-sidebar',
          `linear-gradient(180deg, ${p.glowSecondary.replace(/[\d.]+\)$/, '0.22)')} 0%, rgba(8, 8, 12, 0.65) 100%)`
        );

        // Adapt active accents
        document.documentElement.style.setProperty('--accent-primary', p.accent);
        document.documentElement.style.setProperty('--accent-glow', p.glowPrimary);
      });
    } else {
      setAppPalette(DEFAULT_PALETTE);
      document.documentElement.style.removeProperty('--bg-app');
      document.documentElement.style.removeProperty('--bg-sidebar');
      document.documentElement.style.removeProperty('--accent-primary');
      document.documentElement.style.removeProperty('--accent-glow');
    }
  }, [activeThemeSource]);

  return { appPalette, activeThemeSource };
}