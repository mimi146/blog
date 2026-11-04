import { useEffect, useRef, useState } from 'preact/hooks';
import { assertWithinPixelBudget, extensionForFormat, fitWithin, isHeic, mimeForFormat, type ImageFormat } from '../../lib/tools/image';
import { formatBytes } from '../../lib/tools/format';
import { decodeHeic, releaseHeicDecoder } from '../../lib/tools/heic';
import { releaseLock, tryAcquire } from '../../lib/tools/heic-session';
import { Field, ToolForm, valueOf } from './ui';

interface Compressed {
  name: string;
  before: number;
  after: number;
  width: number;
  height: number;
  url: string;
  downloadName: string;
}

const MAX_BYTES = 25 * 1024 * 1024;

export default function ImageCompressor() {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState(0.8);
  const [maxEdge, setMaxEdge] = useState('1920');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<Compressed[]>([]);
  const [busy, setBusy] = useState(false);
  const urls = useRef<string[]>([]);
  const lock = useRef({ held: false });

  useEffect(() => {
    return () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    };
  }, []);

  async function sourceFor(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
    if (isHeic(file)) {
      setStatus(`Loading the HEIC decoder for ${file.name}…`);
      const imageData = await decodeHeic(new Uint8Array(await file.arrayBuffer()));
      const scratch = document.createElement('canvas');
      scratch.width = imageData.width;
      scratch.height = imageData.height;
      const context = scratch.getContext('2d');
      if (!context) throw new Error('Could not draw the HEIC image.');
      context.putImageData(imageData, 0, 0);
      return { source: scratch, width: imageData.width, height: imageData.height };
    }
    const bitmap = await createImageBitmap(file);
    try {
      assertWithinPixelBudget(bitmap.width, bitmap.height);
    } catch (error) {
      bitmap.close();
      throw error;
    }
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  }

  async function compress() {
    if (!tryAcquire(lock.current)) return;
    setBusy(true);
    setErrors([]);
    try {
      await compressFiles();
    } finally {
      try {
        await releaseHeicDecoder();
      } catch {
        // Releasing the decoder must not leave the button stuck.
      }
      releaseLock(lock.current);
      setBusy(false);
    }
  }

  async function compressFiles() {
    if (files.length === 0) {
      setErrors(['Choose an image first.']);
      return;
    }
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current = [];
    setResults([]);
    const next: Compressed[] = [];
    const failures: string[] = [];
    const edge = maxEdge === 'original' ? null : Number(maxEdge);
    for (const file of files) {
      try {
        if (file.size > MAX_BYTES) throw new Error(`${file.name} is over 25 MB.`);
        setStatus(`Compressing ${file.name}…`);
        const decoded = await sourceFor(file);
        const size = fitWithin(decoded.width, decoded.height, edge);
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create a canvas.');
        context.drawImage(decoded.source, 0, 0, size.width, size.height);
        if ('close' in decoded.source && typeof decoded.source.close === 'function') decoded.source.close();
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, mimeForFormat(format), format === 'png' ? undefined : quality),
        );
        if (!blob) throw new Error(`${file.name} could not be encoded as ${format}. Try JPEG.`);
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        const base = file.name.replace(/\.[^.]+$/, '') || 'image';
        next.push({
          name: file.name,
          before: file.size,
          after: blob.size,
          width: size.width,
          height: size.height,
          url,
          downloadName: `${base}.${extensionForFormat(format)}`,
        });
        setResults([...next]);
      } catch (caught) {
        failures.push(caught instanceof Error ? caught.message : `Could not compress ${file.name}.`);
      }
    }
    setErrors(failures);
    setStatus(next.length ? 'Done. The new files are ready to download.' : '');
  }

  return (
    <ToolForm busy={busy} onSubmit={() => void compress()}>
      <Field
        id="img-files"
        label="Images"
        hint="JPEG, PNG, WebP, or HEIC. Each file stays on this device. Limit 25 MB and 50 million pixels."
      >
        <input
          id="img-files"
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          aria-describedby="img-files-hint"
          onChange={(event) => {
            const list = (event.currentTarget as HTMLInputElement).files;
            setFiles(list ? [...list] : []);
          }}
        />
      </Field>
      <div className="tool-grid two">
        <Field id="img-format" label="Output format">
          <select id="img-format" value={format} onChange={(event) => setFormat(valueOf(event) as ImageFormat)}>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
            <option value="png">PNG (lossless)</option>
          </select>
        </Field>
        <Field id="img-edge" label="Longest side">
          <select id="img-edge" value={maxEdge} onChange={(event) => setMaxEdge(valueOf(event))}>
            <option value="original">Original size</option>
            <option value="1280">1280 px</option>
            <option value="1920">1920 px</option>
            <option value="2560">2560 px</option>
          </select>
        </Field>
      </div>
      <Field
        id="img-quality"
        label={`Quality ${Math.round(quality * 100)}%`}
        hint={format === 'png' ? 'PNG ignores quality and keeps every pixel.' : 'Lower quality makes a smaller file.'}
      >
        <input
          id="img-quality"
          type="range"
          min="0.4"
          max="1"
          step="0.05"
          value={quality}
          disabled={format === 'png'}
          aria-describedby="img-quality-hint"
          onInput={(event) => setQuality(Number(valueOf(event)))}
        />
      </Field>
      <div className="tool-actions">
        <button className="tool-btn" type="submit" disabled={busy}>
          {busy ? 'Compressing…' : 'Compress'}
        </button>
      </div>
      <p className="tool-status" role="status" aria-live="polite">
        {status}
      </p>
      {errors.length > 0 ? (
        <div role="alert">
          {errors.map((message, index) => (
            <p className="tool-error" key={`${index}-${message}`}>
              {message}
            </p>
          ))}
        </div>
      ) : null}
      {results.map((item) => {
        const saved = item.before - item.after;
        const ratio = item.before === 0 ? 0 : Math.abs(saved) / item.before;
        return (
          <article className="image-result" key={`${item.name}-${item.url}`}>
            <img src={item.url} alt={`Compressed ${item.name}`} width={item.width} height={item.height} />
            <p>
              {item.name}: {formatBytes(item.before)} to {formatBytes(item.after)} ({saved >= 0 ? 'smaller' : 'larger'} by{' '}
              {Math.round(ratio * 100)}%), {item.width}×{item.height} px.
            </p>
            <a className="tool-btn secondary" href={item.url} download={item.downloadName}>
              Download {item.downloadName}
            </a>
          </article>
        );
      })}
    </ToolForm>
  );
}
