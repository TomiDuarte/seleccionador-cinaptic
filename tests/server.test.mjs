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
import { eventEndTime } from '../public/event.js';

const answers = [0,2,1,0,1,2];
const key = () => randomBytes(32).toString('hex');
test('historial privado de canjes incluye datos y fechas, pagina sin exponer respuestas', async t => {
  const { request, login } = await withApp(t);
  assert.equal((await request('/api/admin/redeemed')).status, 401);
  const cookie = await login();
  assert.deepEqual(await (await request('/api/admin/redeemed', undefined, cookie)).json(), { items: [], hasMore: false });
  for (const offset of ['-1', 'abc', '1.5']) assert.equal((await request(`/api/admin/redeemed?offset=${offset}`, undefined, cookie)).status, 400);
  const pending = await (await request('/api/participations', { key: key(), career: 'otra', answers })).json();
  let last;
  for (let i = 0; i < 52; i++) {
    last = await (await request('/api/participations', { key: key(), name: `Participante ${i}`, career: 'sistemas', answers })).json();
    await request('/api/admin/redeem', { code: last.code, kind: 'base' }, cookie);
  }
  const bonus = await (await request('/api/admin/redeem', { code: last.code, kind: 'bonus', confirmed: true }, cookie)).json();
  const first = await (await request('/api/admin/redeemed', undefined, cookie)).json();
  const second = await (await request('/api/admin/redeemed?offset=50', undefined, cookie)).json();
  assert.equal(first.items.length, 50); assert.equal(first.hasMore, true);
  assert.equal(second.items.length, 2); assert.equal(second.hasMore, false);
  const all = [...first.items, ...second.items];
  assert.equal(new Set(all.map(x => x.code)).size, 52);
  assert.ok(!all.some(x => x.code === pending.code));
  const row = all.find(x => x.code === last.code);
  assert.equal(row.name, 'Participante 51'); assert.equal(row.career, 'sistemas');
  assert.equal(row.baseAt, bonus.baseAt); assert.equal(row.bonusAt, bonus.bonusAt);
  assert.deepEqual(Object.keys(row).sort(), ['baseAt', 'bonusAt', 'career', 'code', 'name']);
});
async function withApp(t, options = {}) {
  const password = randomBytes(24).toString('hex');
  const server = createApp({ database: ':memory:', password, now: () => Date.parse('2026-11-27T21:00:00-03:00'), ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body, cookie, headers = {}) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(path.startsWith('/api/participations') ? { eventId: config.eventId, name: 'Ada Lovelace', ...body } : body) }) });
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
    const current = store.issue(participant, 'otra', answers, 'Ada Lovelace');
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
    const ticket = store.issue(participant, 'explorando', answers, 'Ada Lovelace');
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
  const ticket = store.issue(participant, 'sistemas', answers, 'Ada Lovelace');
  assert.equal(store.own(participant).code, ticket.code);
  assert.equal(store.lookup(ticket.code).code, ticket.code);
  store.redeem(ticket.code, 'base');
  assert.equal(store.lookup(ticket.code).baseAt !== null, true);
  assert.deepEqual(store.stats(), { participants: 1, redeemed: 1, extras: 0 });
  store.redeem(ticket.code, 'bonus', true);
  const redeemed = store.lookup(ticket.code);
  const updated = store.retake(participant, 'otra', questions.map(q => q.options.findIndex(option => option.line === 'inteligentes')), 'Ada Lovelace');
  assert.equal(updated.code, ticket.code);
  assert.equal(updated.createdAt, ticket.createdAt);
  assert.equal(updated.baseAt, redeemed.baseAt);
  assert.equal(updated.bonusAt, redeemed.bonusAt);
  assert.deepEqual(updated.result.topIds, ['inteligentes']);
  assert.deepEqual(store.stats(), { participants: 1, redeemed: 1, extras: 1 });
  assert.throws(() => store.retake(key(), 'otra', answers, 'Ada Lovelace'), { status: 404 });
});
test('sirve sitio, panel y recursos con políticas del navegador', async t => {
  const { request } = await withApp(t);
  for (const path of ['/', '/admin', '/app.js', '/styles.css', '/hat.svg']) {
    const response = await request(path); assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  }
});

test('nombre y carrera quedan asociados al código, se validan y son visibles en el panel', async t => {
  const { request, login } = await withApp(t);
  const participant = key();
  for (const name of [undefined, null, '', '   ', 'a'.repeat(101), 123, 'Ana\nMaría']) {
    assert.equal((await request('/api/participations', { key: participant, name, career: 'sistemas', answers })).status, 400);
  }
  const ticket = await (await request('/api/participations', { key: participant, name: '  Ana María  ', career: 'sistemas', answers })).json();
  assert.equal(ticket.name, 'Ana María');
  const cookie = await login();
  const found = await (await request(`/api/admin/coupon?code=${ticket.code}`, undefined, cookie)).json();
  assert.equal(found.name, 'Ana María');
  assert.equal(found.career, 'sistemas');
  const updated = await (await request('/api/participations/retake', { key: participant, name: 'Ana', career: 'quimica', answers })).json();
  assert.equal(updated.name, 'Ana');
  assert.equal(updated.career, 'quimica');
  assert.equal(updated.code, ticket.code);
});

test('el límite es exactamente el 27/11 a las 22:00 de Argentina y lo impone el servidor', async t => {
  let time = eventEndTime - 1;
  const { request, login } = await withApp(t, { now: () => time });
  const body = { key: key(), name: 'Ana', career: 'otra', answers };
  assert.equal((await (await request('/api/event')).json()).closed, false);
  const initial = await (await request('/api/participations', body)).json();
  assert.match(initial.code, /^CN-/);
  const cookie = await login();
  for (time of [eventEndTime, eventEndTime + 1, eventEndTime + 86400000]) {
    const status = await (await request('/api/event')).json();
    assert.equal(status.closed, true);
    assert.equal(status.contactUrl, config.contactUrl);
    for (const path of ['/api/participations', '/api/participations/retake', '/api/participations?vista=abierto']) {
      const response = await request(path, body);
      assert.equal(response.status, 410);
      assert.equal((await response.json()).code, 'EVENT_CLOSED');
    }
    const response = await request('/api/participations', { ...body, key: key() });
    assert.equal(response.status, 410);
  }
  const found = await (await request(`/api/admin/coupon?code=${initial.code}`, undefined, cookie)).json();
  assert.equal(found.name, 'Ana');
  assert.equal((await (await request('/api/admin/stats', undefined, cookie)).json()).participants, 1);
});

test('migración de SQLite conserva códigos y canjes anteriores sin inventar nombres', () => {
  const folder = mkdtempSync(join(tmpdir(), 'cinaptic-test-'));
  const filename = join(folder, 'legacy.sqlite');
  let store;
  try {
    const db = new DatabaseSync(filename);
    db.exec(`CREATE TABLE participations (id INTEGER PRIMARY KEY, event TEXT NOT NULL, token_hash TEXT NOT NULL, code TEXT NOT NULL UNIQUE, career TEXT NOT NULL, answers TEXT NOT NULL, created_at TEXT NOT NULL, base_at TEXT, bonus_at TEXT, UNIQUE(event, token_hash));`);
    db.prepare('INSERT INTO participations (event,token_hash,code,career,answers,created_at,base_at) VALUES (?,?,?,?,?,?,?)').run(config.eventId, 'old', 'CN-AAAAA-BBBBB', 'otra', JSON.stringify(answers), '2026-11-27T21:00:00Z', '2026-11-27T21:10:00Z');
    db.close();
    store = createStore(filename);
    assert.equal(store.lookup('CN-AAAAA-BBBBB').name, null);
    assert.equal(store.lookup('CN-AAAAA-BBBBB').baseAt, '2026-11-27T21:10:00Z');
    const participant = key();
    store.issue(participant, 'sistemas', answers, 'María');
    store.close();
    store = createStore(filename);
    assert.equal(store.own(participant).name, 'María');
  } finally {
    store?.close();
    const target = resolve(folder);
    assert.ok(target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('cinaptic-test-'));
    rmSync(target, { recursive: true, force: true });
  }
});

test('Vercel sin base permanente no emite códigos ni informa que un código válido está mal escrito', async t => {
  const previous = process.env.VERCEL;
  process.env.VERCEL = '1';
  t.after(() => { process.env.VERCEL = previous; });
  let time = eventEndTime - 60000;
  const { request } = await withApp(t, { now: () => time });
  const health = await request('/api/health');
  assert.equal(health.status, 503);
  assert.deepEqual(await health.json(), { ok: false, database: 'unconfigured' });
  for (const path of ['/api/participations', '/api/participations/retake', '/api/admin/redeem']) {
    const response = await request(path, { key: key(), name: 'Ana', career: 'otra', answers, code: 'CN-GDNNV-VGFVK', kind: 'base' });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'STORAGE_UNAVAILABLE');
  }
  const lookup = await request('/api/admin/coupon?code=CN-GDNNV-VGFVK');
  assert.equal(lookup.status, 503);
  assert.match((await lookup.json()).error, /base de datos permanente/);
  assert.equal((await request('/api/admin/stats')).status, 503);
  assert.equal((await request('/api/participation')).status, 503);
  assert.equal((await request('/api/admin/login', { password: 'anything' })).status, 503);
  for (const path of ['/', '/admin', '/app.js', '/api/event']) assert.equal((await request(path)).status, 200);
  time = eventEndTime;
  assert.equal((await (await request('/api/event')).json()).closed, true);
  const closed = await request('/api/participations', { key: key(), career: 'otra', answers });
  assert.equal(closed.status, 410);
  assert.equal((await closed.json()).code, 'EVENT_CLOSED');
});
