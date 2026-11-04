import { assertWithinPixelBudget } from './image';

interface HeifImage {
  get_width(): number;
  get_height(): number;
  display(imageData: ImageData, callback: (data: ImageData | null) => void): void;
  /** Releases the native image handle. Present on libheif-js 1.23. */
  free?: () => void;
}

interface HeifDecoder {
  decode(data: Uint8Array): HeifImage[];
}

interface LibHeif {
  HeifDecoder: new () => HeifDecoder;
}

/**
 * One decoder for the page. libheif-js frees the previous native context at the
 * start of the next decode, so a batch does not keep a context per file.
 */
let session: Promise<HeifDecoder> | null = null;

function loadDecoder(): Promise<HeifDecoder> {
  session ??= import('libheif-js/libheif-wasm/libheif-bundle.mjs').then(async (imported) => {
    const factory = imported.default as () => LibHeif | Promise<LibHeif>;
    const libheif = await factory();
    return new libheif.HeifDecoder();
  });
  return session;
}

/**
 * Decode a HEIC/HEIF file with the libheif WASM bundle.
 * The bundle is a separate chunk, imported only when a HEIC file is opened.
 * Image bytes stay in the browser. They are not sent to a server.
 */
export async function decodeHeic(bytes: Uint8Array): Promise<ImageData> {
  const decoder = await loadDecoder();
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
