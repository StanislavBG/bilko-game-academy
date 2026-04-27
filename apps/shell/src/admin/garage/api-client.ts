import type { ContentPack } from '@bilko/boat-shooter-schema';

const DEFAULT_BASE = 'http://localhost:3001';
const TOKEN_KEY = 'garage:token';

function baseUrl(): string {
  // Vite injects VITE_* env at build time. Fallback to localhost so the
  // Garage works against a developer-run content server out of the box.
  const fromEnv = (import.meta.env.VITE_CONTENT_SERVER_URL as string | undefined)?.trim();
  return (fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE).replace(/\/$/, '');
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredToken(): string {
  return readToken() ?? '';
}

export function setStoredToken(token: string): void {
  try {
    if (token.length === 0) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* noop — private mode / quota */
  }
}

async function failureReason(res: Response): Promise<string> {
  // Server contract is `{ reason: string }` on errors; fall back to status text.
  try {
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const body = (await res.json()) as { reason?: unknown };
      if (typeof body.reason === 'string' && body.reason.length > 0) return body.reason;
    } else {
      const text = await res.text();
      if (text.length > 0) return text;
    }
  } catch {
    /* ignore parse errors */
  }
  return `${res.status} ${res.statusText}`;
}

async function authedFetch(path: string, init: RequestInit): Promise<Response> {
  const token = readToken();
  const headers = new Headers(init.headers);
  if (token && token.length > 0) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${baseUrl()}${path}`, { ...init, headers });
}

export async function getContent(): Promise<ContentPack> {
  const res = await fetch(`${baseUrl()}/v1/content`, { method: 'GET' });
  if (!res.ok) throw new Error(await failureReason(res));
  return (await res.json()) as ContentPack;
}

export type SectionName =
  | 'sprites' | 'stages' | 'environments' | 'ships' | 'enemies' | 'weapons' | 'passives' | 'ability-maps';

export async function putSection(name: SectionName, data: unknown): Promise<void> {
  const res = await authedFetch(`/v1/content/section/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await failureReason(res));
}

export interface RegenResult {
  url: string;
  pngB64: string;
}

export async function regenSprite(
  id: string,
  prompt: string,
  useSource: boolean,
  sourcePngB64?: string,
): Promise<RegenResult> {
  // Body shape mirrors the content-server contract from docs/30-garage-admin.md.
  const body: Record<string, unknown> = { prompt, useSource };
  if (typeof sourcePngB64 === 'string') body.sourcePngB64 = sourcePngB64;
  const res = await authedFetch(`/v1/sprite/${encodeURIComponent(id)}/regen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await failureReason(res));
  return (await res.json()) as RegenResult;
}

export async function putSpritePng(id: string, blob: Blob): Promise<void> {
  const res = await authedFetch(`/v1/sprite/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: blob,
  });
  if (!res.ok) throw new Error(await failureReason(res));
}

export function spriteUrl(id: string): string {
  return `${baseUrl()}/v1/sprite/${encodeURIComponent(id)}.png`;
}
