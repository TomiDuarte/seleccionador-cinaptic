import { randomBytes, createHash } from 'node:crypto';
import { calculateResult, validAnswers, validCareer, validName } from '../public/quiz.js';
import { config } from '../public/content.js';
import { neon } from '@neondatabase/serverless';

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
  await sql`ALTER TABLE participations ADD COLUMN IF NOT EXISTS name TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at BIGINT NOT NULL
    )
  `;
  const hash = key => createHash('sha256').update(key).digest('hex');
  const expose = row => row ? {
    code: row.code,
    name: row.name || null,
    career: row.career,
    answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
    createdAt: row.created_at,
    baseAt: row.base_at,
    bonusAt: row.bonus_at,
    result: calculateResult(typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers),
  } : null;
  return {
    async issue(key, career, answers, name) {
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key) || !validCareer(career) || !validAnswers(answers) || !validName(name)) {
        throw Object.assign(new Error('Revisá tu nombre, la carrera y las respuestas.'), { status: 400 });
      }
      const tokenHash = hash(key);
      const existing = await sql`
        SELECT * FROM participations
        WHERE event = ${config.eventId} AND token_hash = ${tokenHash}
      `;
      if (existing.length) return expose(existing[0]);
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let attempt = 0; attempt < 20; attempt++) {
        const bytes = randomBytes(10);
        const chars = [...bytes].map(b => alphabet[b % alphabet.length]).join('');
        const code = `CN-${chars.slice(0, 5)}-${chars.slice(5, 10)}`;
        try {
          const inserted = await sql`
            INSERT INTO participations (event, token_hash, code, career, answers, created_at, name)
            VALUES (${config.eventId}, ${tokenHash}, ${code}, ${career}, ${JSON.stringify(answers)}::jsonb, ${new Date().toISOString()}, ${name.trim()})
            ON CONFLICT (event, token_hash) DO NOTHING
            RETURNING *
          `;
          if (inserted.length) return expose(inserted[0]);
          const repeated = await sql`
            SELECT * FROM participations
            WHERE event = ${config.eventId} AND token_hash = ${tokenHash}
          `;
          if (repeated.length) return expose(repeated[0]);
        } catch (error) {
          if (error.code !== '23505') throw error;
        }
      }
      throw Object.assign(new Error('No pudimos generar un código único. Volvé a intentar.'), { status: 500 });
    },
    async retake(key, career, answers, name) {
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key) || !validCareer(career) || !validAnswers(answers) || !validName(name)) {
        throw Object.assign(new Error('Revisá tu nombre, la carrera y las respuestas.'), { status: 400 });
      }
      // Profile and answers change; the original coupon and redemption dates survive.
      const rows = await sql`
        UPDATE participations SET career = ${career}, answers = ${JSON.stringify(answers)}::jsonb, name = ${name.trim()}
        WHERE event = ${config.eventId} AND token_hash = ${hash(key)}
        RETURNING *
      `;
      if (!rows.length) throw Object.assign(new Error('No encontramos tu participación. Acercate al stand con tu código.'), { status: 404 });
      return expose(rows[0]);
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
      const updated = kind === 'base'
        ? await sql`
            UPDATE participations SET base_at = ${timestamp}
            WHERE event = ${config.eventId} AND code = ${code} AND base_at IS NULL
            RETURNING *
          `
        : await sql`
            UPDATE participations SET bonus_at = ${timestamp}
            WHERE event = ${config.eventId} AND code = ${code} AND base_at IS NOT NULL AND bonus_at IS NULL
            RETURNING *
          `;
      if (!updated.length) {
        if (!await this.lookup(code)) throw Object.assign(new Error('No encontramos ese código.'), { status: 404 });
        throw Object.assign(new Error('Este premio ya fue canjeado o falta entregar el premio inicial.'), { status: 409 });
      }
      return expose(updated[0]);
    },
    async redeemed(offset = 0, limit = 51) {
      return await sql`
        SELECT code, name, career, base_at AS "baseAt", bonus_at AS "bonusAt"
        FROM participations
        WHERE event = ${config.eventId} AND (base_at IS NOT NULL OR bonus_at IS NOT NULL)
        ORDER BY COALESCE(bonus_at, base_at) DESC, code ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
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
