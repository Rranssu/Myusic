export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  glowPrimary: string;
  glowSecondary: string;
}

const DEFAULT_PALETTE: Palette = {
  primary: "rgb(250, 45, 72)",
  secondary: "rgb(110, 60, 230)",
  accent: "#fa2d48",
  glowPrimary: "rgba(250, 45, 72, 0.75)",
  glowSecondary: "rgba(110, 60, 230, 0.65)"
};

export async function extractPaletteFromImage(imageUrl: string): Promise<Palette> {
  if (!imageUrl) return DEFAULT_PALETTE;

  try {
    // 1. Fetch image directly as a local blob
    const response = await fetch(imageUrl);
    if (!response.ok) return DEFAULT_PALETTE;
    const blob = await response.blob();

    // 2. Decode and downsample using browser native ImageBitmap API
    const bitmap = await createImageBitmap(blob, { resizeWidth: 24, resizeHeight: 24 });

    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return DEFAULT_PALETTE;

    ctx.drawImage(bitmap, 0, 0);
    const imgData = ctx.getImageData(0, 0, 24, 24).data;

    let bestColor = { r: 250, g: 45, b: 72, score: -1 };
    let secondColor = { r: 110, g: 60, b: 230, score: -1 };
    let fallbackColor = { r: 120, g: 120, b: 140 };

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const brightness = max / 255;

      // Keep a fallback if the whole image is dark/light
      if (brightness > 0.25 && brightness < 0.85) {
        fallbackColor = { r, g, b };
      }

      // Ignore near-black or washed out whites
      if (brightness < 0.12 || brightness > 0.94 || saturation < 0.15) continue;

      // Score based on saturation and ideal mid-brightness
      const score = saturation * 2.0 + (1 - Math.abs(brightness - 0.55));

      if (score > bestColor.score) {
        secondColor = { ...bestColor };
        bestColor = { r, g, b, score };
      } else if (score > secondColor.score) {
        const colorDiff = Math.abs(r - bestColor.r) + Math.abs(g - bestColor.g) + Math.abs(b - bestColor.b);
        if (colorDiff > 45) {
          secondColor = { r, g, b, score };
        }
      }
    }

    const finalPrimary = bestColor.score !== -1 ? bestColor : fallbackColor;
    const finalSecondary = secondColor.score !== -1 ? secondColor : {
      r: Math.min(255, finalPrimary.r + 40),
      g: Math.max(0, finalPrimary.g - 30),
      b: Math.min(255, finalPrimary.b + 60)
    };

    const pR = finalPrimary.r;
    const pG = finalPrimary.g;
    const pB = finalPrimary.b;

    const sR = finalSecondary.r;
    const sG = finalSecondary.g;
    const sB = finalSecondary.b;

    console.log(`[Myusic Palette] Extracted: rgb(${pR},${pG},${pB}) and rgb(${sR},${sG},${sB})`);

    return {
      primary: `rgb(${pR}, ${pG}, ${pB})`,
      secondary: `rgb(${sR}, ${sG}, ${sB})`,
      accent: `rgb(${pR}, ${pG}, ${pB})`,
      glowPrimary: `rgba(${pR}, ${pG}, ${pB}, 0.75)`,
      glowSecondary: `rgba(${sR}, ${sG}, ${sB}, 0.65)`
    };
  } catch (err) {
    console.warn("Palette extraction error:", err);
    return DEFAULT_PALETTE;
  }
}