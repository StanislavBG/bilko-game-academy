import type { FastifyReply, FastifyRequest } from 'fastify';

const ADMIN_TOKEN = process.env['ADMIN_TOKEN'];

/**
 * The admin server is a local indie-dev tool — it binds to 127.0.0.1 by
 * default, so only `localhost` can reach it. If ADMIN_TOKEN is set, we
 * require it (handy when running the server on a LAN-shared machine for
 * pair-design); if it's not, we allow all writes (the loopback bind is
 * the security boundary).
 */
if (!ADMIN_TOKEN) {
  console.warn('[auth] ADMIN_TOKEN unset — writes allowed from 127.0.0.1 only.');
}

export async function requireBearer(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!ADMIN_TOKEN) return; // dev mode; loopback bind is the gate
  const header = req.headers.authorization ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m || m[1] !== ADMIN_TOKEN) {
    reply.code(401).send({ error: 'unauthorized' });
    return;
  }
}
