declare module 'qrcode' {
  export interface QRCodeRenderOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    type?: 'svg' | 'utf8' | 'terminal';
  }
  export function toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeRenderOptions): Promise<void>;
  export function toString(text: string, options?: QRCodeRenderOptions): Promise<string>;
}

declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(imageData: ImageData, callback: (data: ImageData | null) => void): void;
  }
  interface LibHeif {
    HeifDecoder: new () => { decode(data: Uint8Array): HeifImage[] };
  }
  export default function libheifFactory(): LibHeif | Promise<LibHeif>;
}
