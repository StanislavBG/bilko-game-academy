import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ContentPack, SpriteManifest } from '@bilko/boat-shooter-schema';
import {
  getContent,
  putSection,
  putSpritePng,
  regenSprite,
  spriteUrl,
} from './api-client';

interface Props {
  spriteId: string;
  manifestPrompt: string;
  onClose: () => void;
  onSaved?: (newUrl: string) => void;
  refetchContent?: () => void;
}

type Mode = 'idle' | 'cropping' | 'erasing';

interface State {
  mode: Mode;
  originalPng: ImageData | null;
  currentPng: ImageData | null;
  prompt: string;
  useSource: boolean;
  history: ImageData[];
  brushRadius: number;
  busy: boolean;
  error: string | null;
}

type Action =
  | { type: 'set-mode'; mode: Mode }
  | { type: 'load'; png: ImageData }
  | { type: 'load-failed' }
  | { type: 'replace-current'; png: ImageData }
  | { type: 'commit-generation'; png: ImageData }
  | { type: 'commit-save' }
  | { type: 'reset' }
  | { type: 'set-prompt'; value: string }
  | { type: 'set-use-source'; value: boolean }
  | { type: 'set-brush'; value: number }
  | { type: 'set-busy'; value: boolean }
  | { type: 'set-error'; value: string | null }
  | { type: 'restore-history'; index: number };

const HISTORY_CAP = 5;
const CANVAS_SIZE = 320;

function cloneImageData(src: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set-mode':
      return { ...state, mode: action.mode };
    case 'load':
      return {
        ...state,
        originalPng: action.png,
        currentPng: action.png,
        error: null,
      };
    case 'load-failed':
      return { ...state, originalPng: null, currentPng: null };
    case 'replace-current':
      return { ...state, currentPng: action.png };
    case 'commit-generation': {
      // Push prior baseline into history so the user can rewind generations.
      const history = state.currentPng
        ? [...state.history, state.currentPng].slice(-HISTORY_CAP)
        : state.history;
      return {
        ...state,
        history,
        currentPng: action.png,
        originalPng: action.png,
        busy: false,
        error: null,
      };
    }
    case 'commit-save':
      return state.currentPng
        ? { ...state, originalPng: state.currentPng, error: null }
        : state;
    case 'reset':
      return state.originalPng
        ? { ...state, currentPng: cloneImageData(state.originalPng), mode: 'idle' }
        : state;
    case 'set-prompt':
      return { ...state, prompt: action.value };
    case 'set-use-source':
      return { ...state, useSource: action.value };
    case 'set-brush':
      return { ...state, brushRadius: action.value };
    case 'set-busy':
      return { ...state, busy: action.value };
    case 'set-error':
      return { ...state, error: action.value };
    case 'restore-history': {
      const entry = state.history[action.index];
      if (!entry) return state;
      return { ...state, currentPng: cloneImageData(entry) };
    }
    default:
      return state;
  }
}

function rotate(src: ImageData, dir: 1 | -1): ImageData {
  // 90° rotation: O(w*h). Walk source contiguously; non-contiguous writes are
  // unavoidable but the buffer fits in L1 at 320×320.
  const { width: w, height: h, data: s } = src;
  const dst = new Uint8ClampedArray(s.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const dx = dir === 1 ? h - 1 - y : y;
      const dy = dir === 1 ? x : w - 1 - x;
      const di = (dy * h + dx) * 4;
      dst[di] = s[si]!;
      dst[di + 1] = s[si + 1]!;
      dst[di + 2] = s[si + 2]!;
      dst[di + 3] = s[si + 3]!;
    }
  }
  return new ImageData(dst, h, w);
}

function flip(src: ImageData, axis: 'h' | 'v'): ImageData {
  const { width: w, height: h, data: s } = src;
  const dst = new Uint8ClampedArray(s.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const dx = axis === 'h' ? w - 1 - x : x;
      const dy = axis === 'v' ? h - 1 - y : y;
      const di = (dy * w + dx) * 4;
      dst[di] = s[si]!;
      dst[di + 1] = s[si + 1]!;
      dst[di + 2] = s[si + 2]!;
      dst[di + 3] = s[si + 3]!;
    }
  }
  return new ImageData(dst, w, h);
}

function crop(src: ImageData, x: number, y: number, w: number, h: number): ImageData {
  const cx = Math.max(0, Math.min(src.width, Math.round(x)));
  const cy = Math.max(0, Math.min(src.height, Math.round(y)));
  const cw = Math.max(1, Math.min(src.width - cx, Math.round(w)));
  const ch = Math.max(1, Math.min(src.height - cy, Math.round(h)));
  const dst = new Uint8ClampedArray(cw * ch * 4);
  for (let row = 0; row < ch; row++) {
    const srcStart = ((cy + row) * src.width + cx) * 4;
    const dstStart = row * cw * 4;
    dst.set(src.data.subarray(srcStart, srcStart + cw * 4), dstStart);
  }
  return new ImageData(dst, cw, ch);
}

function eraseCircle(target: ImageData, cx: number, cy: number, r: number): void {
  // Mutates in place — caller must pass a fresh clone if the original needs to live.
  const { width: w, height: h, data } = target;
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        data[(y * w + x) * 4 + 3] = 0;
      }
    }
  }
}

async function blobToImageData(blob: Blob): Promise<ImageData> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, bmp.width, bmp.height);
}

function imageDataToBlob(img: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas 2d unavailable'));
  ctx.putImageData(img, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('toBlob returned null'));
    }, 'image/png');
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  // Chunked btoa avoids the 100k-char arg-limit on large PNGs.
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const initialState: State = {
  mode: 'idle',
  originalPng: null,
  currentPng: null,
  prompt: '',
  useSource: true,
  history: [],
  brushRadius: 12,
  busy: false,
  error: null,
};

export function SpriteWidget({
  spriteId,
  manifestPrompt,
  onClose,
  onSaved,
  refetchContent,
}: Props): JSX.Element {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    prompt: manifestPrompt,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = `${spriteUrl(spriteId)}?t=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const blob = await res.blob();
        const png = await blobToImageData(blob);
        if (!cancelled) dispatch({ type: 'load', png });
      } catch {
        if (!cancelled) dispatch({ type: 'load-failed' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spriteId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.currentPng) return;
    // Scale the live ImageData to the visible 320×320 surface via an offscreen
    // staging canvas — putImageData ignores transforms, drawImage doesn't.
    const stage = document.createElement('canvas');
    stage.width = state.currentPng.width;
    stage.height = state.currentPng.height;
    const sctx = stage.getContext('2d');
    if (!sctx) return;
    sctx.putImageData(state.currentPng, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(stage, 0, 0, canvas.width, canvas.height);
  }, [state.currentPng]);

  const canvasToImage = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      const img = state.currentPng;
      if (!canvas || !img) return null;
      const rect = canvas.getBoundingClientRect();
      const sx = (clientX - rect.left) / rect.width;
      const sy = (clientY - rect.top) / rect.height;
      return { x: sx * img.width, y: sy * img.height };
    },
    [state.currentPng],
  );

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!state.currentPng) return;
    const pt = canvasToImage(e.clientX, e.clientY);
    if (!pt) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    if (state.mode === 'cropping') {
      dragRef.current = { x: pt.x, y: pt.y, active: true };
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.style.display = 'block';
        const r = canvasRef.current!.getBoundingClientRect();
        overlay.style.left = `${e.clientX - r.left}px`;
        overlay.style.top = `${e.clientY - r.top}px`;
        overlay.style.width = '0px';
        overlay.style.height = '0px';
      }
    } else if (state.mode === 'erasing') {
      const next = cloneImageData(state.currentPng);
      eraseCircle(next, pt.x, pt.y, state.brushRadius);
      dragRef.current = { x: pt.x, y: pt.y, active: true };
      dispatch({ type: 'replace-current', png: next });
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!dragRef.current?.active) return;
    const pt = canvasToImage(e.clientX, e.clientY);
    if (!pt) return;
    if (state.mode === 'cropping') {
      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      const start = dragRef.current;
      if (!overlay || !canvas) return;
      const r = canvas.getBoundingClientRect();
      const startScreenX = (start.x / state.currentPng!.width) * r.width;
      const startScreenY = (start.y / state.currentPng!.height) * r.height;
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const left = Math.min(startScreenX, cx);
      const top = Math.min(startScreenY, cy);
      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
      overlay.style.width = `${Math.abs(cx - startScreenX)}px`;
      overlay.style.height = `${Math.abs(cy - startScreenY)}px`;
    } else if (state.mode === 'erasing' && state.currentPng) {
      const next = cloneImageData(state.currentPng);
      eraseCircle(next, pt.x, pt.y, state.brushRadius);
      dispatch({ type: 'replace-current', png: next });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>): void {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const pt = canvasToImage(e.clientX, e.clientY);
    if (state.mode === 'cropping' && pt && state.currentPng) {
      const x0 = Math.min(drag.x, pt.x);
      const y0 = Math.min(drag.y, pt.y);
      const w = Math.abs(pt.x - drag.x);
      const h = Math.abs(pt.y - drag.y);
      const overlay = overlayRef.current;
      if (overlay) overlay.style.display = 'none';
      if (w >= 4 && h >= 4) {
        const next = crop(state.currentPng, x0, y0, w, h);
        dispatch({ type: 'replace-current', png: next });
      }
      dispatch({ type: 'set-mode', mode: 'idle' });
    }
  }

  async function handleGenerate(): Promise<void> {
    if (state.busy) return;
    dispatch({ type: 'set-busy', value: true });
    dispatch({ type: 'set-error', value: null });
    try {
      let sourceB64: string | undefined;
      if (state.useSource && state.currentPng) {
        const blob = await imageDataToBlob(state.currentPng);
        sourceB64 = await blobToBase64(blob);
      }
      const result = await regenSprite(
        spriteId,
        state.prompt,
        state.useSource && Boolean(state.currentPng),
        sourceB64,
      );
      const bin = atob(result.pngB64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const png = await blobToImageData(new Blob([u8], { type: 'image/png' }));
      dispatch({ type: 'commit-generation', png });
      onSaved?.(`${spriteUrl(spriteId)}?t=${Date.now()}`);
    } catch (err) {
      dispatch({ type: 'set-busy', value: false });
      dispatch({
        type: 'set-error',
        value: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleSave(): Promise<void> {
    if (!state.currentPng || state.busy) return;
    dispatch({ type: 'set-busy', value: true });
    dispatch({ type: 'set-error', value: null });
    try {
      const blob = await imageDataToBlob(state.currentPng);
      await putSpritePng(spriteId, blob);
      dispatch({ type: 'commit-save' });
      onSaved?.(`${spriteUrl(spriteId)}?t=${Date.now()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly =
        /401|403|503|token|unauthor/i.test(msg)
          ? 'Token required — paste it in the top bar.'
          : msg;
      dispatch({ type: 'set-error', value: friendly });
    } finally {
      dispatch({ type: 'set-busy', value: false });
    }
  }

  async function handleSaveAs(): Promise<void> {
    if (!state.currentPng || state.busy) return;
    const suffix = window.prompt('Variant id (lowercase, dashes only):');
    if (suffix === null) return;
    if (!/^[a-z0-9-]+$/.test(suffix) || suffix.length === 0) {
      dispatch({
        type: 'set-error',
        value: 'Invalid suffix — use lowercase letters, digits, dashes only.',
      });
      return;
    }
    const newId = `${spriteId}-${suffix}`;
    dispatch({ type: 'set-busy', value: true });
    dispatch({ type: 'set-error', value: null });
    try {
      const blob = await imageDataToBlob(state.currentPng);
      await putSpritePng(newId, blob);
      const pack: ContentPack = await getContent();
      const existing: SpriteManifest = pack.sprites;
      // Avoid double-append if the variant already exists in the manifest.
      const already = existing.entries.some((e) => e.id === newId);
      const nextManifest: SpriteManifest = already
        ? existing
        : {
            version: existing.version,
            entries: [
              ...existing.entries,
              {
                id: newId,
                category: 'player-variant',
                prompt: state.prompt,
                required: false,
              },
            ],
          };
      if (!already) {
        await putSection('sprites', nextManifest);
      }
      refetchContent?.();
      onSaved?.(`${spriteUrl(spriteId)}?t=${Date.now()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly =
        /401|403|503|token|unauthor/i.test(msg)
          ? 'Token required — paste it in the top bar.'
          : msg;
      dispatch({ type: 'set-error', value: friendly });
    } finally {
      dispatch({ type: 'set-busy', value: false });
    }
  }

  function applyOp(op: (img: ImageData) => ImageData): void {
    if (!state.currentPng) return;
    dispatch({ type: 'replace-current', png: op(state.currentPng) });
  }

  const toolBtn =
    'w-full px-3 py-1.5 rounded border border-sea-700 bg-sea-950 text-sea-100 text-xs uppercase tracking-wider hover:border-gold-500 hover:text-gold-400 disabled:opacity-40 disabled:cursor-not-allowed';
  const activeBtn =
    'w-full px-3 py-1.5 rounded border border-gold-500 bg-gold-500/20 text-gold-300 text-xs uppercase tracking-wider';

  const historyThumbs = useMemo(() => state.history.slice().reverse(), [state.history]);

  return (
    <div className="mt-4 w-full max-w-[640px] rounded-lg border border-sea-700 bg-sea-950/80 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm uppercase tracking-wider text-gold-400">
          Sprite Widget — {spriteId}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-0.5 rounded border border-sea-700 text-sea-300 text-xs hover:border-red-500 hover:text-red-300"
        >
          Close
        </button>
      </div>

      {state.error && (
        <div className="px-3 py-2 rounded border border-red-700 bg-red-900/40 text-red-200 text-xs">
          {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="bg-sea-900 rounded border border-sea-700"
            style={{
              cursor:
                state.mode === 'cropping'
                  ? 'crosshair'
                  : state.mode === 'erasing'
                    ? 'cell'
                    : 'default',
            }}
          />
          <div
            ref={overlayRef}
            className="absolute pointer-events-none border-2 border-dashed border-gold-400"
            style={{ display: 'none' }}
          />
          {state.busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-sea-950/60 rounded">
              <div className="animate-pulse text-xs uppercase tracking-wider text-gold-300">
                Working…
              </div>
            </div>
          )}
          {!state.currentPng && !state.busy && (
            <div className="absolute inset-0 flex items-center justify-center text-sea-400 text-xs italic">
              No image — type a prompt and Generate.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 w-32">
          <button
            type="button"
            disabled={!state.currentPng || state.busy}
            className={state.mode === 'cropping' ? activeBtn : toolBtn}
            onClick={() =>
              dispatch({
                type: 'set-mode',
                mode: state.mode === 'cropping' ? 'idle' : 'cropping',
              })
            }
          >
            Crop
          </button>
          <button
            type="button"
            disabled={!state.currentPng || state.busy}
            className={toolBtn}
            onClick={() => applyOp((i) => rotate(i, 1))}
          >
            Rot 90
          </button>
          <button
            type="button"
            disabled={!state.currentPng || state.busy}
            className={toolBtn}
            onClick={() => applyOp((i) => rotate(i, -1))}
          >
            Rot −90
          </button>
          <button
            type="button"
            disabled={!state.currentPng || state.busy}
            className={toolBtn}
            onClick={() => applyOp((i) => flip(i, 'h'))}
          >
            Flip H
          </button>
          <button
            type="button"
            disabled={!state.currentPng || state.busy}
            className={toolBtn}
            onClick={() => applyOp((i) => flip(i, 'v'))}
          >
            Flip V
          </button>
          <button
            type="button"
            disabled={!state.currentPng || state.busy}
            className={state.mode === 'erasing' ? activeBtn : toolBtn}
            onClick={() =>
              dispatch({
                type: 'set-mode',
                mode: state.mode === 'erasing' ? 'idle' : 'erasing',
              })
            }
          >
            Erase
          </button>
          {state.mode === 'erasing' && (
            <label className="flex flex-col gap-0.5 text-[10px] text-sea-300">
              <span>Brush: {state.brushRadius}px</span>
              <input
                type="range"
                min={2}
                max={48}
                value={state.brushRadius}
                onChange={(e) =>
                  dispatch({ type: 'set-brush', value: Number(e.target.value) })
                }
              />
            </label>
          )}
          <button
            type="button"
            disabled={!state.originalPng || state.busy}
            className={toolBtn}
            onClick={() => dispatch({ type: 'reset' })}
          >
            Reset
          </button>
        </div>
      </div>

      <textarea
        value={state.prompt}
        onChange={(e) => dispatch({ type: 'set-prompt', value: e.target.value })}
        rows={4}
        className="w-full px-2 py-1.5 bg-sea-900 border border-sea-700 rounded text-sea-100 text-xs focus:outline-none focus:border-gold-500 font-mono"
      />

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-sea-200">
          <input
            type="checkbox"
            checked={state.useSource}
            onChange={(e) =>
              dispatch({ type: 'set-use-source', value: e.target.checked })
            }
          />
          <span>use current sprite</span>
        </label>
        <button
          type="button"
          disabled={state.busy || state.prompt.trim().length === 0}
          onClick={() => void handleGenerate()}
          className="px-3 py-1.5 rounded border border-gold-500 bg-gold-500/15 text-gold-300 text-xs uppercase tracking-wider hover:bg-gold-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Generate
        </button>
        <button
          type="button"
          disabled={state.busy || !state.currentPng}
          onClick={() => void handleSave()}
          className="px-3 py-1.5 rounded border border-sea-600 bg-sea-800 text-sea-100 text-xs uppercase tracking-wider hover:border-gold-500 hover:text-gold-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          type="button"
          disabled={state.busy || !state.currentPng}
          onClick={() => void handleSaveAs()}
          className="px-3 py-1.5 rounded border border-sea-600 bg-sea-800 text-sea-100 text-xs uppercase tracking-wider hover:border-gold-500 hover:text-gold-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save as…
        </button>
      </div>

      <div className="border-t border-sea-800 pt-2">
        <div className="text-[10px] uppercase tracking-wider text-sea-400 mb-1">
          History (last {HISTORY_CAP})
        </div>
        {historyThumbs.length === 0 ? (
          <div className="text-xs text-sea-500 italic">
            Each Generate pushes the previous image here.
          </div>
        ) : (
          <div className="flex gap-2">
            {historyThumbs.map((img, idx) => (
              <HistoryThumb
                key={idx}
                imageData={img}
                onClick={() =>
                  dispatch({
                    type: 'restore-history',
                    index: state.history.length - 1 - idx,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryThumb({
  imageData,
  onClick,
}: {
  imageData: ImageData;
  onClick: () => void;
}): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const stage = document.createElement('canvas');
    stage.width = imageData.width;
    stage.height = imageData.height;
    const sctx = stage.getContext('2d');
    if (!sctx) return;
    sctx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(stage, 0, 0, canvas.width, canvas.height);
  }, [imageData]);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-12 h-12 rounded border border-sea-700 bg-sea-900 hover:border-gold-500"
      title="Restore"
    >
      <canvas ref={ref} width={48} height={48} className="w-full h-full" />
    </button>
  );
}
