import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getBundled } from './bundled.js';
import { mergePack } from './merge.js';
import {
  ensureDirs,
  loadOverrides,
  loadSpritePath,
  saveOverrideSection,
  saveSpritePng,
} from './storage.js';
import { urlSectionToKey, validateSection } from './validate.js';
import { requireBearer } from './auth.js';
import { regenSprite } from './gemini.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// dist/server.js sits two levels above the repo root's bundled-sprite folder
// when running compiled, and src/server.ts sits the same depth in dev.
const REPO_ROOT = resolve(__dirname, '../../..');
const BUNDLED_SPRITES_DIR = join(REPO_ROOT, 'apps/games/boat-shooter/assets/sprites');

ensureDirs();

const app = Fastify({ logger: true });

const origin = process.env['BILKO_ORIGIN'] ?? '*';
await app.register(cors, { origin });

// Accept raw PNG bodies for sprite uploads.
app.addContentTypeParser(
  'application/octet-stream',
  { parseAs: 'buffer' },
  (_req, body, done) => done(null, body),
);

function buildPack(): { json: string; etag: string } {
  const merged = mergePack(getBundled(), loadOverrides());
  const json = JSON.stringify(merged);
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
  saveOverrideSection(key, body);
  reply.send({ ok: true, section: key });
});

app.get('/v1/sprite/:id.png', async (req, reply) => {
  const { id } = req.params as { id: string };
  const overridePath = loadSpritePath(id);
  let path = overridePath;
  if (!path) {
    const fallback = join(BUNDLED_SPRITES_DIR, `${id}.png`);
    if (existsSync(fallback)) path = fallback;
  }
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
  saveSpritePng(id, body);
  reply.send({ ok: true, id, bytes: body.length });
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
  saveSpritePng(id, buf);
  reply.send({ ok: true, url: `/v1/sprite/${id}.png`, pngB64: result.pngB64 });
});

const port = Number(process.env['PORT'] ?? 3001);
const host = process.env['HOST'] ?? '0.0.0.0';
try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
