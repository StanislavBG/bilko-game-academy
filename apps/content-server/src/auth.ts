import type { FastifyReply, FastifyRequest } from 'fastify';

const ADMIN_TOKEN = process.env['ADMIN_TOKEN'];

if (!ADMIN_TOKEN) {
  // Fail-loud: it's better to refuse all writes than silently allow them.
  console.warn('[auth] ADMIN_TOKEN is not set; all write endpoints will return 503.');
}

export async function requireBearer(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!ADMIN_TOKEN) {
    reply.code(503).send({ error: 'ADMIN_TOKEN not configured' });
    return;
  }
  const header = req.headers.authorization ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m || m[1] !== ADMIN_TOKEN) {
    reply.code(401).send({ error: 'unauthorized' });
    return;
  }
}
