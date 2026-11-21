import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { calculateResult, validAnswers, validCareer } from '../public/quiz.js';
import { config } from '../public/content.js';
import { neon } from '@neondatabase/serverless';

export function createStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS participations (
      id INTEGER PRIMARY KEY, event TEXT NOT NULL, token_hash TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE, career TEXT NOT NULL, answers TEXT NOT NULL,
      created_at TEXT NOT NULL, base_at TEXT, bonus_at TEXT,
      UNIQUE(event, token_hash)
    );`);
  const hash = key => createHash('sha256').update(key).digest('hex');
  const expose = row => row ? {
    code: row.code, career: row.career, answers: JSON.parse(row.answers),
    createdAt: row.created_at, baseAt: row.base_at, bonusAt: row.bonus_at,
    result: calculateResult(JSON.parse(row.answers)),
  } : null;
  return {
    issue(key, career, answers) {
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key) || !validCareer(career) || !validAnswers(answers)) {
        throw Object.assign(new Error('Revisá la carrera y las respuestas.'), { status: 400 });
      }
      const existing = db.prepare('SELECT * FROM participations WHERE event=? AND token_hash=?').get(config.eventId, hash(key));
      if (existing) return expose(existing);
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code;
      do {
        const bytes = randomBytes(10);
        const chars = [...bytes].map(b => alphabet[b % alphabet.length]).join('');
        code = `CN-${chars.slice(0,5)}-${chars.slice(5)}`;
      } while (db.prepare('SELECT id FROM participations WHERE code=?').get(code));
      db.prepare('INSERT INTO participations (event,token_hash,code,career,answers,created_at) VALUES (?,?,?,?,?,?)')
        .run(config.eventId, hash(key), code, career, JSON.stringify(answers), new Date().toISOString());
      return this.lookup(code);
    },
    own(key) {
      if (!/^[a-f0-9]{64}$/.test(key || '')) return null;
      return expose(db.prepare('SELECT * FROM participations WHERE event=? AND token_hash=?').get(config.eventId, hash(key)));
    },
    lookup(code) { return expose(db.prepare('SELECT * FROM participations WHERE event=? AND code=?').get(config.eventId, code)); },
    redeem(code, kind, confirmed) {
      if (!['base', 'bonus'].includes(kind)) throw Object.assign(new Error('Premio inválido.'), { status: 400 });
      if (kind === 'bonus' && confirmed !== true) throw Object.assign(new Error('Confirmá que viste el mensaje compartido.'), { status: 400 });
      const column = kind === 'base' ? 'base_at' : 'bonus_at';
      const result = db.prepare(`UPDATE participations SET ${column}=? WHERE event=? AND code=? AND ${column} IS NULL ${kind === 'bonus' ? 'AND base_at IS NOT NULL' : ''}`)
        .run(new Date().toISOString(), config.eventId, code);
      if (!result.changes) {
        if (!this.lookup(code)) throw Object.assign(new Error('No encontramos ese código.'), { status: 404 });
        throw Object.assign(new Error('Este premio ya fue canjeado o falta entregar el premio inicial.'), { status: 409 });
      }
      return this.lookup(code);
    },
    stats() { return db.prepare('SELECT COUNT(*) AS participants, COUNT(base_at) AS redeemed, COUNT(bonus_at) AS extras FROM participations WHERE event=?').get(config.eventId); },
    close() { db.close(); },
  };
}

export async function createPostgresStore(connectionString) {
  const sql = neon(connectionString);
  await sql`
    CREATE TABLE IF NOT EXISTS participations (
      id BIGSERIAL PRIMARY KEY,
      event TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      career TEXT NOT NULL,
      answers JSONB NOT NULL,
      created_at TEXT NOT NULL,
      base_at TEXT,
      bonus_at TEXT,
      UNIQUE(event, token_hash)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at BIGINT NOT NULL
    )
  `;
  const hash = key => createHash('sha256').update(key).digest('hex');
  const expose = row => row ? {
    code: row.code,
    career: row.career,
    answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
    createdAt: row.created_at,
    baseAt: row.base_at,
    bonusAt: row.bonus_at,
    result: calculateResult(typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers),
  } : null;
  return {
    async issue(key, career, answers) {
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key) || !validCareer(career) || !validAnswers(answers)) {
        throw Object.assign(new Error('Revisá la carrera y las respuestas.'), { status: 400 });
      }
      const existing = await sql`
        SELECT * FROM participations
        WHERE event = ${config.eventId} AND token_hash = ${hash(key)}
      `;
      if (existing.length) return expose(existing[0]);
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code;
      for (let attempt = 0; attempt < 20; attempt++) {
        const bytes = randomBytes(10);
        code = `CN-${[...bytes].map(b => alphabet[b % alphabet.length]).join('').slice(0, 5)}-${[...bytes].map(b => alphabet[b % alphabet.length]).join('').slice(5)}`;
        try {
          const inserted = await sql`
            INSERT INTO participations (event, token_hash, code, career, answers, created_at)
            VALUES (${config.eventId}, ${hash(key)}, ${code}, ${career}, ${JSON.stringify(answers)}::jsonb, ${new Date().toISOString()})
            ON CONFLICT (event, token_hash) DO NOTHING
            RETURNING *
          `;
          if (inserted.length) return expose(inserted[0]);
          const repeated = await sql`
            SELECT * FROM participations
            WHERE event = ${config.eventId} AND token_hash = ${hash(key)}
          `;
          if (repeated.length) return expose(repeated[0]);
        } catch (error) {
          if (error.code !== '23505') throw error;
        }
      }
      throw Object.assign(new Error('No pudimos generar un código único. Volvé a intentar.'), { status: 500 });
    },
    async own(key) {
      if (!/^[a-f0-9]{64}$/.test(key || '')) return null;
      const rows = await sql`
        SELECT * FROM participations
        WHERE event = ${config.eventId} AND token_hash = ${hash(key)}
      `;
      return expose(rows[0]);
    },
    async lookup(code) {
      const rows = await sql`
        SELECT * FROM participations
        WHERE event = ${config.eventId} AND code = ${code}
      `;
      return expose(rows[0]);
    },
    async redeem(code, kind, confirmed) {
      if (!['base', 'bonus'].includes(kind)) throw Object.assign(new Error('Premio inválido.'), { status: 400 });
      if (kind === 'bonus' && confirmed !== true) throw Object.assign(new Error('Confirmá que viste el mensaje compartido.'), { status: 400 });
      const timestamp = new Date().toISOString();
      let updated;
      if (kind === 'base') {
        updated = await sql`
          UPDATE participations SET base_at = ${timestamp}
          WHERE event = ${config.eventId} AND code = ${code} AND base_at IS NULL
          RETURNING *
        `;
      } else {
        updated = await sql`
          UPDATE participations SET bonus_at = ${timestamp}
          WHERE event = ${config.eventId} AND code = ${code} AND base_at IS NOT NULL AND bonus_at IS NULL
          RETURNING *
        `;
      }
      if (!updated.length) {
        if (!await this.lookup(code)) throw Object.assign(new Error('No encontramos ese código.'), { status: 404 });
        throw Object.assign(new Error('Este premio ya fue canjeado o falta entregar el premio inicial.'), { status: 409 });
      }
      return expose(updated[0]);
    },
    async stats() {
      const rows = await sql`
        SELECT
          COUNT(*)::integer AS participants,
          COUNT(base_at)::integer AS redeemed,
          COUNT(bonus_at)::integer AS extras
        FROM participations
        WHERE event = ${config.eventId}
      `;
      return rows[0];
    },
    async close() {},
    async createSession(token, expiresAt) {
      await sql`
        INSERT INTO admin_sessions (token_hash, expires_at)
        VALUES (${hash(token)}, ${expiresAt})
        ON CONFLICT (token_hash) DO UPDATE SET expires_at = ${expiresAt}
      `;
    },
    async authenticated(token) {
      if (!/^[a-f0-9]{64}$/.test(token || '')) return false;
      const rows = await sql`
        SELECT 1 FROM admin_sessions
        WHERE token_hash = ${hash(token)} AND expires_at > ${Date.now()}
      `;
      return rows.length > 0;
    },
    async logout(token) {
      if (!token) return;
      await sql`DELETE FROM admin_sessions WHERE token_hash = ${hash(token)}`;
    },
  };
}
