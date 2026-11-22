import './helpers/isolate-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { config, questions } from '../public/content.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename, sep } from 'node:path';
import { createApp } from '../server/index.mjs';
import { createStore } from '../server/store.sqlite.mjs';
import { createMemoryStore } from '../server/store.memory.mjs';

const answers = [0,2,1,0,1,2];
const key = () => randomBytes(32).toString('hex');
async function withApp(t) {
  const password = randomBytes(24).toString('hex');
  const server = createApp({ database: ':memory:', password });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body, cookie, headers = {}) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(path.startsWith('/api/participations') ? { eventId: config.eventId, ...body } : body) }) });
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

test('repetir actualiza el resultado sin duplicar el código ni reactivar premios', async t => {
  const { request, login } = await withApp(t);
  const participant = key();
  const initial = await (await request('/api/participations', { key: participant, career: 'sistemas', answers })).json();
  const newAnswers = questions.map(q => q.options.findIndex(option => option.line === 'software'));
  const repeatBody = { key: participant, career: 'otra', answers: newAnswers };
  const firstRepeat = await (await request('/api/participations/retake', repeatBody)).json();
  assert.equal(firstRepeat.code, initial.code);
  assert.equal(firstRepeat.baseAt, null);
  assert.deepEqual(firstRepeat.result.topIds, ['software']);
  const cookie = await login();
  await request('/api/admin/redeem', { code: initial.code, kind: 'base' }, cookie);
  const redeemed = await (await request('/api/admin/redeem', { code: initial.code, kind: 'bonus', confirmed: true }, cookie)).json();
  const parallel = await Promise.all([1, 2].map(() => request('/api/participations/retake', repeatBody)));
  for (const response of parallel) {
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.code, initial.code);
    assert.equal(result.createdAt, initial.createdAt);
    assert.equal(result.baseAt, redeemed.baseAt);
    assert.equal(result.bonusAt, redeemed.bonusAt);
    assert.equal(result.career, 'otra');
    assert.deepEqual(result.result.topIds, ['software']);
  }
  assert.equal((await request('/api/admin/redeem', { code: initial.code, kind: 'base' }, cookie)).status, 409);
  assert.equal((await request('/api/admin/redeem', { code: initial.code, kind: 'bonus', confirmed: true }, cookie)).status, 409);
  assert.deepEqual(await (await request('/api/admin/stats', undefined, cookie)).json(), { participants: 1, redeemed: 1, extras: 1 });
  const own = await (await request('/api/participation', undefined, null, { Authorization: `Bearer ${participant}` })).json();
  assert.deepEqual(own.answers, newAnswers);
});

test('repetir no emite códigos para claves desconocidas ni acepta datos inválidos', async t => {
  const { request, login } = await withApp(t);
  const valid = { key: key(), career: 'otra', answers };
  assert.equal((await request('/api/participations/retake', valid)).status, 404);
  assert.equal((await request('/api/participations/retake', { ...valid, key: 'invalid' })).status, 400);
  assert.equal((await request('/api/participations/retake', { ...valid, answers: [] })).status, 400);
  assert.equal((await request('/api/participations/retake', { ...valid, eventId: 'old' })).status, 409);
  const cookie = await login();
  assert.equal((await (await request('/api/admin/stats', undefined, cookie)).json()).participants, 0);
});

test('rechaza respuestas enviadas desde una versión anterior del cuestionario', async t => {
  const { request } = await withApp(t);
  for (const eventId of ['noche-universidades-2026', null]) {
    const response = await request('/api/participations', { eventId, key: key(), career: 'otra', answers });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /Recargá la página/);
  }
});

test('la nueva edición deja los códigos de prueba anteriores fuera del panel', () => {
  const folder = mkdtempSync(join(tmpdir(), 'cinaptic-test-'));
  const filename = join(folder, 'edition.sqlite');
  const store = createStore(filename);
  let db;
  try {
    db = new DatabaseSync(filename);
    const participant = key();
    const oldCode = 'CN-AAAAA-BBBBB';
    db.prepare('INSERT INTO participations (event,token_hash,code,career,answers,created_at) VALUES (?,?,?,?,?,?)')
      .run('noche-universidades-2026', createHash('sha256').update(participant).digest('hex'), oldCode, 'otra', JSON.stringify(answers), new Date().toISOString());
    assert.equal(store.own(participant), null);
    assert.equal(store.lookup(oldCode), null);
    assert.equal(store.stats().participants, 0);
    const current = store.issue(participant, 'otra', answers);
    assert.notEqual(current.code, oldCode);
    assert.equal(store.stats().participants, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM participations').get().n, 2);
  } finally {
    db?.close(); store.close();
    const target = resolve(folder);
    assert.ok(target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('cinaptic-test-'));
    rmSync(target, { recursive: true, force: true });
  }
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
test('el almacén temporal emite, consulta y canjea participaciones', () => {
  const store = createMemoryStore();
  const participant = key();
  const ticket = store.issue(participant, 'sistemas', answers);
  assert.equal(store.own(participant).code, ticket.code);
  assert.equal(store.lookup(ticket.code).code, ticket.code);
  store.redeem(ticket.code, 'base');
  assert.equal(store.lookup(ticket.code).baseAt !== null, true);
  assert.deepEqual(store.stats(), { participants: 1, redeemed: 1, extras: 0 });
  store.redeem(ticket.code, 'bonus', true);
  const redeemed = store.lookup(ticket.code);
  const updated = store.retake(participant, 'otra', questions.map(q => q.options.findIndex(option => option.line === 'inteligentes')));
  assert.equal(updated.code, ticket.code);
  assert.equal(updated.createdAt, ticket.createdAt);
  assert.equal(updated.baseAt, redeemed.baseAt);
  assert.equal(updated.bonusAt, redeemed.bonusAt);
  assert.deepEqual(updated.result.topIds, ['inteligentes']);
  assert.deepEqual(store.stats(), { participants: 1, redeemed: 1, extras: 1 });
  assert.throws(() => store.retake(key(), 'otra', answers), { status: 404 });
});
test('sirve sitio, panel y recursos con políticas del navegador', async t => {
  const { request } = await withApp(t);
  for (const path of ['/', '/admin', '/app.js', '/styles.css', '/hat.svg']) {
    const response = await request(path); assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  }
});
