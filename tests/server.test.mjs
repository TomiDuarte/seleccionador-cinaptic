import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename, sep } from 'node:path';
import { createApp } from '../server/index.mjs';
import { createStore } from '../server/store.sqlite.mjs';

const answers = [0,2,1,0,1,2];
const key = () => randomBytes(32).toString('hex');
async function withApp(t) {
  const password = randomBytes(24).toString('hex');
  const server = createApp({ database: ':memory:', password });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body, cookie, headers = {}) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const login = async () => { const res = await request('/api/admin/login', { password }); assert.equal(res.status, 200); return res.headers.get('set-cookie').split(';')[0]; };
  return { request, login };
}

test('emisión idempotente, consulta privada y código diferente para otra participación', async t => {
  const { request } = await withApp(t); const participant = key();
  const body = { key: participant, career: 'sistemas', answers };
  const one = await (await request('/api/participations', body)).json();
  const two = await (await request('/api/participations', { ...body, career: 'otra' })).json();
  assert.match(one.code, /^CN-[A-Z2-9]{5}-[A-Z2-9]{5}$/); assert.equal(one.code, two.code); assert.equal(two.career, 'sistemas');
  const other = await (await request('/api/participations', { ...body, key: key() })).json();
  assert.notEqual(one.code, other.code);
  assert.equal((await request('/api/participation')).status, 404);
  const own = await (await request('/api/participation', undefined, null, { Authorization: `Bearer ${participant}` })).json();
  assert.equal(own.code, one.code);
});
test('dos operadores no pueden canjear el mismo premio; extra exige comprobación', async t => {
  const { request, login } = await withApp(t);
  const ticket = await (await request('/api/participations', { key: key(), career: 'secundaria', answers })).json();
  const cookie1 = await login(); const cookie2 = await login();
  assert.equal((await request('/api/admin/redeem', { code: ticket.code, kind: 'base' })).status, 401);
  assert.equal((await request('/api/admin/redeem', { code: ticket.code, kind: 'bonus', confirmed: true }, cookie1)).status, 409);
  const concurrent = await Promise.all([cookie1, cookie2].map(cookie => request('/api/admin/redeem', { code: ticket.code, kind: 'base' }, cookie)));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  assert.equal((await request('/api/admin/redeem', { code: ticket.code, kind: 'bonus' }, cookie1)).status, 400);
  assert.equal((await request('/api/admin/redeem', { code: ticket.code, kind: 'bonus', confirmed: true }, cookie1)).status, 200);
  assert.equal((await request('/api/admin/redeem', { code: ticket.code, kind: 'bonus', confirmed: true }, cookie2)).status, 409);
  const stats = await (await request('/api/admin/stats', undefined, cookie1)).json();
  assert.deepEqual(stats, { participants: 1, redeemed: 1, extras: 1 });
});
test('autenticación, cierre de sesión, origen, entrada inválida y archivos privados', async t => {
  const { request, login } = await withApp(t);
  assert.equal((await request('/api/admin/login', { password: 'incorrecta' })).status, 401);
  assert.equal((await request('/api/admin/stats')).status, 401);
  assert.equal((await request('/api/participations', { key: key(), career: 'otra', answers: [] })).status, 400);
  assert.equal((await request('/api/participations', { key: key(), career: 'otra', answers }, null, { Origin: 'https://otro.example' })).status, 403);
  assert.equal((await request('/.env')).status, 404);
  assert.equal((await request('/server/index.mjs')).status, 404);
  assert.equal((await request('/%2e%2e%5c.env')).status, 404);
  const cookie = await login();
  assert.equal((await request('/api/admin/coupon?code=CN-INVALIDO', undefined, cookie)).status, 404);
  assert.equal((await request('/api/admin/logout', {}, cookie)).status, 200);
  assert.equal((await request('/api/admin/stats', undefined, cookie)).status, 401);
});
test('limita intentos de contraseña incorrecta', async t => {
  const { request } = await withApp(t);
  for (let i = 0; i < 10; i++) assert.equal((await request('/api/admin/login', { password: 'no' })).status, 401);
  assert.equal((await request('/api/admin/login', { password: 'no' })).status, 429);
});
test('el código y los canjes sobreviven a reiniciar la base', () => {
  const folder = mkdtempSync(join(tmpdir(), 'cinaptic-test-'));
  const filename = join(folder, 'event.sqlite'); let store;
  try {
    store = createStore(filename); const participant = key();
    const ticket = store.issue(participant, 'explorando', answers);
    store.redeem(ticket.code, 'base'); store.close(); store = createStore(filename);
    assert.equal(store.own(participant).code, ticket.code);
    assert.ok(store.lookup(ticket.code).baseAt);
    assert.throws(() => store.redeem(ticket.code, 'base'), { status: 409 });
  } finally {
    store?.close();
    const target = resolve(folder);
    assert.ok(target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('cinaptic-test-'));
    rmSync(target, { recursive: true, force: true });
  }
});
test('sirve sitio, panel y recursos con políticas del navegador', async t => {
  const { request } = await withApp(t);
  for (const path of ['/', '/admin', '/app.js', '/styles.css', '/hat.svg']) {
    const response = await request(path); assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  }
});
