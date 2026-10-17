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
