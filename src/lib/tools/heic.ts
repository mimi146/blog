import { assertWithinPixelBudget } from './image';
import { createSerialQueue, loadOnce } from './heic-session';

interface HeifImage {
  get_width(): number;
  get_height(): number;
  display(imageData: ImageData, callback: (data: ImageData | null) => void): void;
  /** Releases the native image handle. Present on libheif-js 1.23. */
  free?: () => void;
}

interface HeifDecoder {
  decode(data: Uint8Array): HeifImage[];
  /** Native context pointer. Null after the context is released. */
  decoder?: number | null;
}

interface LibHeif {
  HeifDecoder: new () => HeifDecoder;
  heif_context_free?: (context: number) => void;
}

interface HeifSession {
  lib: LibHeif;
  decoder: HeifDecoder;
}

const enqueue = createSerialQueue();
const cache: { current: Promise<HeifSession> | null } = { current: null };

function loadSession(): Promise<HeifSession> {
  return loadOnce(cache, async () => {
    const imported = await import('libheif-js/libheif-wasm/libheif-bundle.mjs');
    const factory = imported.default as () => LibHeif | Promise<LibHeif>;
    const lib = await factory();
    return { lib, decoder: new lib.HeifDecoder() };
  });
}

/**
 * Decode a HEIC/HEIF file with the libheif WASM bundle.
 * Decodes run one at a time: libheif frees the previous context at the start of
 * the next decode, so two overlapping decodes would free a context still in use.
 * The bundle is imported only when a HEIC file is opened. Image bytes stay in the browser.
 */
export function decodeHeic(bytes: Uint8Array): Promise<ImageData> {
  return enqueue(() => decodeNow(bytes));
}

/** Release the native context after a batch. The next HEIC file loads a fresh decoder. */
export function releaseHeicDecoder(): Promise<void> {
  return enqueue(async () => {
    const pending = cache.current;
    cache.current = null;
    if (!pending) return;
    try {
      const { lib, decoder } = await pending;
      freeContext(lib, decoder);
    } catch {
      // The load failed and loadOnce already cleared the cache.
    }
  });
}

async function decodeNow(bytes: Uint8Array): Promise<ImageData> {
  const { decoder } = await loadSession();
  const images = decoder.decode(bytes);
  try {
    const image = images[0];
    if (!image) throw new Error('No picture was found in that HEIC file.');
    const width = image.get_width();
    const height = image.get_height();
    if (!width || !height) throw new Error('The HEIC image has no size.');
    assertWithinPixelBudget(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare a canvas for the HEIC image.');
    const imageData = context.createImageData(width, height);
    await new Promise<void>((resolve, reject) => {
      image.display(imageData, (displayed) => {
        if (!displayed) reject(new Error('The HEIC image could not be decoded.'));
        else resolve();
      });
    });
    return imageData;
  } finally {
    for (const image of images) releaseImage(image);
  }
}

function releaseImage(image: HeifImage): void {
  try {
    image.free?.();
  } catch {
    // The handle may already have been released.
  }
}

function freeContext(lib: LibHeif, decoder: HeifDecoder): void {
  const context = decoder.decoder;
  if (context == null || typeof lib.heif_context_free !== 'function') return;
  try {
    lib.heif_context_free(context);
    decoder.decoder = null;
  } catch {
    // The next page load drops the module. A failed free must not trap the button.
  }
}
