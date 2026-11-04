export type ImageFormat = 'jpeg' | 'webp' | 'png';

/** Stay under common browser canvas limits, including iOS Safari. */
export const MAX_PIXELS = 50_000_000;

export function assertWithinPixelBudget(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('The image dimensions are invalid.');
  }
  if (width * height > MAX_PIXELS) {
    throw new Error(
      `This image is ${Math.round(width)}×${Math.round(height)} pixels, which is too large to process in the browser. Resize it on your device and try again.`,
    );
  }
}

export function isHeic(file: { name: string; type: string }): boolean {
  if (/image\/hei[cf]/i.test(file.type)) return true;
  return /\.(heic|heif)$/i.test(file.name);
}

export function fitWithin(width: number, height: number, maxEdge: number | null): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('The image dimensions are invalid.');
  }
  const rounded = { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  if (maxEdge == null || (rounded.width <= maxEdge && rounded.height <= maxEdge)) return rounded;
  const scale = maxEdge / Math.max(rounded.width, rounded.height);
  return {
    width: Math.max(1, Math.round(rounded.width * scale)),
    height: Math.max(1, Math.round(rounded.height * scale)),
  };
}

export function mimeForFormat(format: ImageFormat): string {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

export function extensionForFormat(format: ImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}
