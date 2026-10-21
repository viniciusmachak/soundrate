/**
 * Samples an image and resolves its dominant color as `rgb(r, g, b)`,
 * ignoring near-black, near-white and transparent pixels.
 * Resolves `null` when the image cannot be read (e.g. CORS) or has no usable color.
 */
export function extractDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise(resolve => {
    if (!imageUrl) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 40;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const buckets = new Map<number, { count: number; red: number; green: number; blue: number }>();

        for (let index = 0; index < pixels.length; index += 16) {
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const alpha = pixels[index + 3];
          const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
          if (alpha < 180 || brightness < 24 || brightness > 232) continue;

          const key = (red >> 5) << 6 | (green >> 5) << 3 | (blue >> 5);
          const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
          bucket.count++;
          bucket.red += red;
          bucket.green += green;
          bucket.blue += blue;
          buckets.set(key, bucket);
        }

        const dominant = [...buckets.values()].sort((left, right) => right.count - left.count)[0];
        resolve(dominant
          ? `rgb(${Math.round(dominant.red / dominant.count)}, ${Math.round(dominant.green / dominant.count)}, ${Math.round(dominant.blue / dominant.count)})`
          : null);
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = imageUrl;
  });
}

/**
 * Keeps the dominant color's hue and saturation and only lowers its lightness
 * until white text on it keeps at least 4.5:1 contrast.
 */
export function toBackdropColor(rgb: string): string {
  const match = rgb.match(/\d+/g);
  if (!match) return rgb;

  const [hue, saturation, lightness] = rgbToHsl(+match[0], +match[1], +match[2]);
  // Relative luminance ≤ 0.18 keeps white text at ≥ 4.5:1.
  let backdropLightness = lightness;
  let color = hslToRgb(hue, saturation, backdropLightness);
  while (relativeLuminance(color) > 0.18 && backdropLightness > 0.05) {
    backdropLightness -= 0.02;
    color = hslToRgb(hue, saturation, backdropLightness);
  }

  return `rgb(${color.map(Math.round).join(', ')})`;
}

/** Dominant color of an image as a solid, text-safe backdrop color. */
export async function extractBackdropColor(imageUrl: string): Promise<string | null> {
  const dominant = await extractDominantColor(imageUrl);
  return dominant ? toBackdropColor(dominant) : null;
}

function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255, g = green / 255, b = blue / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue = max === r ? (g - b) / delta + (g < b ? 6 : 0)
    : max === g ? (b - r) / delta + 2
    : (r - g) / delta + 4;
  return [hue / 6, saturation, lightness];
}

function hslToRgb(hue: number, saturation: number, lightness: number): number[] {
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const channel = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(hue + 1 / 3), channel(hue), channel(hue - 1 / 3)].map(value => value * 255);
}

function relativeLuminance([red, green, blue]: number[]): number {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}
