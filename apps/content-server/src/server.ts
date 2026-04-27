import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getBundled } from './bundled.js';
import {
  ensureDirs,
  loadSpritePath,
  saveSection,
  saveSpritePng,
} from './storage.js';
import { urlSectionToKey, validateSection } from './validate.js';
import { requireBearer } from './auth.js';
import { regenSprite } from './gemini.js';

/**
 * Boat Shooter Admin content server — local dev tool for the indie dev.
 *
 * **Edits land directly in the canonical JSON / PNG files in git** (see
 * storage.ts). There is no overrides overlay, no publish step. Workflow:
 *   admin save → file diff on disk → `git status` → commit → push
 *
 * The game runtime in production reads bundled JSON only; this server is
 * never deployed live.
 */

ensureDirs();

const app = Fastify({ logger: true });

const origin = process.env['BILKO_ORIGIN'] ?? '*';
await app.register(cors, { origin });

app.addContentTypeParser(
  'application/octet-stream',
  { parseAs: 'buffer' },
  (_req, body, done) => done(null, body),
);

function buildPack(): { json: string; etag: string } {
  const json = JSON.stringify(getBundled());
  const etag = `"${createHash('sha1').update(json).digest('hex')}"`;
  return { json, etag };
}

app.get('/healthz', async () => ({ ok: true }));

app.get('/v1/content', async (req, reply) => {
  const { json, etag } = buildPack();
  const inm = req.headers['if-none-match'];
  if (typeof inm === 'string' && inm === etag) {
    reply.code(304).header('ETag', etag).send();
    return;
  }
  reply
    .header('Content-Type', 'application/json; charset=utf-8')
    .header('ETag', etag)
    .header('Cache-Control', 'public, max-age=0, must-revalidate')
    .send(json);
});

app.put('/v1/content/section/:name', { preHandler: requireBearer }, async (req, reply) => {
  const { name } = req.params as { name: string };
  const key = urlSectionToKey(name);
  if (!key) {
    reply.code(404).send({ error: `unknown section: ${name}` });
    return;
  }
  const body = req.body;
  const result = validateSection(key, body);
  if (!result.ok) {
    reply.code(400).send({ error: result.reason ?? 'invalid body' });
    return;
  }
  const path = saveSection(name as Parameters<typeof saveSection>[0], body);
  reply.send({ ok: true, section: key, path });
});

app.get('/v1/sprite/:id.png', async (req, reply) => {
  const { id } = req.params as { id: string };
  const path = loadSpritePath(id);
  if (!path) {
    reply.code(404).send({ error: `sprite not found: ${id}` });
    return;
  }
  const buf = readFileSync(path);
  reply
    .header('Content-Type', 'image/png')
    .header('Cache-Control', 'public, max-age=60')
    .send(buf);
});

app.put('/v1/sprite/:id', { preHandler: requireBearer }, async (req, reply) => {
  const { id } = req.params as { id: string };
  const body = req.body;
  if (!Buffer.isBuffer(body)) {
    reply.code(400).send({ error: 'expected application/octet-stream PNG body' });
    return;
  }
  const path = saveSpritePng(id, body);
  reply.send({ ok: true, id, bytes: body.length, path });
});

app.post('/v1/sprite/:id/regen', { preHandler: requireBearer }, async (req, reply) => {
  const { id } = req.params as { id: string };
  const body = req.body as { prompt?: string; useSource?: boolean; sourcePngB64?: string } | null;
  if (!body || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    reply.code(400).send({ error: 'prompt is required' });
    return;
  }
  const result = await regenSprite({
    prompt: body.prompt,
    ...(body.useSource !== undefined ? { useSource: body.useSource } : {}),
    ...(body.sourcePngB64 !== undefined ? { sourcePngB64: body.sourcePngB64 } : {}),
  });
  if (!result.ok || !result.pngB64) {
    reply.code(502).send({ error: result.error ?? 'regen failed' });
    return;
  }
  const buf = Buffer.from(result.pngB64, 'base64');
  const path = saveSpritePng(id, buf);
  reply.send({ ok: true, url: `/v1/sprite/${id}.png`, pngB64: result.pngB64, path });
});

const port = Number(process.env['PORT'] ?? 3001);
const host = process.env['HOST'] ?? '127.0.0.1';
try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
