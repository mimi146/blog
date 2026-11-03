interface HeifImage {
  get_width(): number;
  get_height(): number;
  display(imageData: ImageData, callback: (data: ImageData | null) => void): void;
}

interface LibHeif {
  HeifDecoder: new () => { decode(data: Uint8Array): HeifImage[] };
}

/**
 * Decode a HEIC/HEIF file with the libheif WASM bundle.
 * The bundle is a separate chunk, imported only when a HEIC file is opened.
 * Image bytes stay in the browser. They are not sent to a server.
 */
export async function decodeHeic(bytes: Uint8Array): Promise<ImageData> {
  const imported = await import('libheif-js/libheif-wasm/libheif-bundle.mjs');
  const factory = imported.default as () => LibHeif | Promise<LibHeif>;
  const libheif = await factory();
  const images = new libheif.HeifDecoder().decode(bytes);
  const image = images[0];
  if (!image) throw new Error('No picture was found in that HEIC file.');
  const width = image.get_width();
  const height = image.get_height();
  if (!width || !height) throw new Error('The HEIC image has no size.');
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
}
