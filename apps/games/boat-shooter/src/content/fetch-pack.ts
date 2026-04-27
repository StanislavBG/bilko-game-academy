import type { ContentPack } from '@bilko/boat-shooter-schema';

/**
 * Fetch the merged ContentPack from the online store.
 *
 * Returns null on:
 *   - missing/empty url (offline mode — no overlay requested)
 *   - network error / abort / non-2xx / invalid JSON
 *
 * Failures are silent because the bundled fallback is the desired
 * default behavior — a console.warn is emitted once so devs can spot
 * server outages without spamming the player console with errors.
 *
 * The 1500 ms timeout is short enough that boot doesn't visibly stall
 * on a flaky network; bundled defaults are rich enough that overlay
 * loss is invisible to players.
 */
export async function fetchPack(opts: {
  url?: string | undefined;
  timeoutMs?: number | undefined;
}): Promise<ContentPack | null> {
  const url = opts.url?.trim();
  if (!url) return null;

  const timeoutMs = opts.timeoutMs ?? 1500;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const endpoint = `${url.replace(/\/$/, '')}/v1/content`;
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) {
      console.warn(
        '[boat-shooter] content overlay unavailable, using bundled defaults',
        new Error(`HTTP ${res.status}`),
      );
      return null;
    }
    const body = (await res.json()) as unknown;
    if (!isContentPackShape(body)) {
      console.warn(
        '[boat-shooter] content overlay unavailable, using bundled defaults',
        new Error('invalid ContentPack shape'),
      );
      return null;
    }
    return body;
  } catch (err) {
    console.warn(
      '[boat-shooter] content overlay unavailable, using bundled defaults',
      err,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Minimal shape check — version === 1 and the three sections the
 * runtime hard-depends on. We deliberately do not run a deep validator
 * (zod et al) here: the schema already guards the type at compile time
 * for both server and client, and a runtime mismatch falls back to
 * bundled defaults anyway.
 */
function isContentPackShape(x: unknown): x is ContentPack {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (o['version'] !== 1) return false;
  if (typeof o['sprites'] !== 'object' || o['sprites'] === null) return false;
  if (!Array.isArray(o['stages'])) return false;
  if (!Array.isArray(o['ships'])) return false;
  return true;
}
