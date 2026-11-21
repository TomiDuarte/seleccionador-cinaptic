import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, extname, sep } from 'node:path';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { createPostgresStore } from './store.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(resolve(root, '.env'))) {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const digest = value => createHash('sha256').update(value).digest();

export function createApp({ database = resolve(root, process.env.DATABASE_PATH || '.data/cinaptic.sqlite'), password = process.env.ADMIN_PASSWORD || '', secureCookie = process.env.COOKIE_SECURE === 'true' } = {}) {
  const postgresUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL;
  const storeReady = postgresUrl
    ? createPostgresStore(postgresUrl)
    : process.env.VERCEL
      ? import('./store.memory.mjs').then(({ getSharedMemoryStore }) => getSharedMemoryStore())
      : import('./store.sqlite.mjs').then(({ createStore }) => createStore(database));
  const sessions = new Map();
  const limits = new Map();
  const limit = (key, max, windowMs) => {
    const now = Date.now();
    // Bound memory even when many distinct clients connect during the event.
    if (limits.size > 10000) for (const [k, v] of limits) if (v.until < now) limits.delete(k);
    let entry = limits.get(key);
    if (!entry || entry.until < now) { entry = { count: 0, until: now + windowMs }; limits.set(key, entry); }
    if (++entry.count > max) throw Object.assign(new Error('Demasiados intentos. Esperá unos minutos y volvé a probar.'), { status: 429 });
  };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) return json(405, { error: 'Método no permitido.' });
        const relative = url.pathname === '/' ? 'index.html' : url.pathname === '/admin' ? 'admin.html' : decodeURIComponent(url.pathname.slice(1));
        const file = resolve(root, 'public', relative);
        if (!file.startsWith(resolve(root, 'public') + sep)) return json(404, { error: 'No encontrado.' });
        try {
          if (!(await stat(file)).isFile()) return json(404, { error: 'No encontrado.' });
          const body = await readFile(file);
          res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
          return res.end(req.method === 'HEAD' ? undefined : body);
        } catch { return json(404, { error: 'No encontrado.' }); }
      }
      if (url.pathname === '/api/health' && req.method === 'GET') return json(200, {
        ok: true,
        database: postgresUrl ? 'postgres' : process.env.VERCEL ? 'memory' : 'sqlite',
      });
      const store = await storeReady;
      if (!['GET', 'POST'].includes(req.method)) return json(405, { error: 'Método no permitido.' });
      let body = {};
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return json(403, { error: 'Origen no permitido.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Se requiere JSON.' });
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 8192) return json(413, { error: 'Solicitud demasiado grande.' });
        }
        try { body = JSON.parse(raw); } catch { return json(400, { error: 'JSON inválido.' }); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'Solicitud inválida.' });
      }
      const ip =
        req.socket?.remoteAddress ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        'vercel';
      const token = req.headers.cookie?.match(/(?:^|;\s*)cinaptic_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      const persistentStore = Boolean(postgresUrl);
      const authenticated = persistentStore || process.env.VERCEL
        ? token && await store.authenticated(token)
        : token && sessions.get(token) > Date.now();
      const cookie = (value, age) => `cinaptic_session=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${age}${secureCookie ? '; Secure' : ''}`;
      if (url.pathname === '/api/participations' && req.method === 'POST') {
        // High enough for a shared campus Wi-Fi/NAT; not a one-person identity guarantee.
        limit(`issue:${ip}`, 300, 60000);
        return json(200, await store.issue(body.key, body.career, body.answers));
      }
      if (url.pathname === '/api/participation' && req.method === 'GET') {
        const own = await store.own(req.headers.authorization?.replace(/^Bearer /, ''));
        return json(own ? 200 : 404, own || { error: 'Todavía no tenés un resultado guardado.' });
      }
      if (url.pathname === '/api/admin/login' && req.method === 'POST') {
        limit(`login:${ip}`, 10, 15 * 60000);
        if (!password) return json(503, { error: 'Configurá ADMIN_PASSWORD antes de abrir el panel.' });
        if (typeof body.password !== 'string' || !timingSafeEqual(digest(body.password), digest(password))) return json(401, { error: 'Contraseña incorrecta.' });
        for (const [key, expiry] of sessions) if (expiry < Date.now()) sessions.delete(key);
        const newToken = randomBytes(32).toString('hex');
        sessions.set(newToken, Date.now() + 8 * 60 * 60000);
        if (persistentStore || process.env.VERCEL) await store.createSession(newToken, Date.now() + 8 * 60 * 60000);
        res.setHeader('Set-Cookie', cookie(newToken, 8 * 3600));
        return json(200, { ok: true });
      }
      if (url.pathname.startsWith('/api/admin/')) {
        if (!authenticated) return json(401, { error: 'Ingresá al panel para continuar.' });
        if (url.pathname === '/api/admin/logout' && req.method === 'POST') {
          sessions.delete(token);
          if (persistentStore || process.env.VERCEL) await store.logout(token);
          res.setHeader('Set-Cookie', cookie('', 0)); return json(200, { ok: true });
        }
        if (url.pathname === '/api/admin/stats' && req.method === 'GET') return json(200, await store.stats());
        if (url.pathname === '/api/admin/coupon' && req.method === 'GET') {
          const result = await store.lookup((url.searchParams.get('code') || '').trim().toUpperCase());
          return json(result ? 200 : 404, result || { error: 'No encontramos ese código. Revisá las letras y los números.' });
        }
        if (url.pathname === '/api/admin/redeem' && req.method === 'POST') {
          if (typeof body.code !== 'string') return json(400, { error: 'Código inválido.' });
          return json(200, await store.redeem(body.code.trim().toUpperCase(), body.kind, body.confirmed));
        }
      }
      return json(404, { error: 'No encontrado.' });
    } catch (error) {
      if (!error.status) console.error('Error de solicitud:', error.message);
      if (!res.headersSent) json(error.status || 500, {
        error: error.status ? error.message : 'No pudimos completar la operación. Volvé a intentar.',
      });
      else res.end();
    }
  });
  server.on('close', () => storeReady.then(store => store.close()));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3000);
  const server = createApp();
  server.listen(port, process.env.HOST || '0.0.0.0', () => {
    console.log(`CInApTIC listo en http://localhost:${port}\nPanel del stand: http://localhost:${port}/admin`);
    if (!process.env.ADMIN_PASSWORD) console.log('Falta configurar el panel: ejecutá npm run setup y reiniciá.');
  });
}
