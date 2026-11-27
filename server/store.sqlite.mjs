import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { calculateResult, validAnswers, validCareer, validName } from '../public/quiz.js';
import { config } from '../public/content.js';

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
  // Preserve existing records and their redemption history when upgrading.
  if (!db.prepare('PRAGMA table_info(participations)').all().some(column => column.name === 'name')) {
    db.exec('ALTER TABLE participations ADD COLUMN name TEXT');
  }
  const hash = key => createHash('sha256').update(key).digest('hex');
  const expose = row => row ? {
    code: row.code, name: row.name || null, career: row.career, answers: JSON.parse(row.answers),
    createdAt: row.created_at, baseAt: row.base_at, bonusAt: row.bonus_at,
    result: calculateResult(JSON.parse(row.answers)),
  } : null;
  return {
    issue(key, career, answers, name) {
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key) || !validCareer(career) || !validAnswers(answers) || !validName(name)) {
        throw Object.assign(new Error('Revisá tu nombre, la carrera y las respuestas.'), { status: 400 });
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
      db.prepare('INSERT INTO participations (event,token_hash,code,career,answers,created_at,name) VALUES (?,?,?,?,?,?,?)')
        .run(config.eventId, hash(key), code, career, JSON.stringify(answers), new Date().toISOString(), name.trim());
      return this.lookup(code);
    },
    retake(key, career, answers, name) {
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key) || !validCareer(career) || !validAnswers(answers) || !validName(name)) {
        throw Object.assign(new Error('Revisá tu nombre, la carrera y las respuestas.'), { status: 400 });
      }
      const row = db.prepare('UPDATE participations SET career=?, answers=?, name=? WHERE event=? AND token_hash=? RETURNING *')
        .get(career, JSON.stringify(answers), name.trim(), config.eventId, hash(key));
      if (!row) throw Object.assign(new Error('No encontramos tu participación. Acercate al stand con tu código.'), { status: 404 });
      return expose(row);
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
    redeemed(offset = 0, limit = 51) {
      return db.prepare('SELECT code, name, career, base_at AS baseAt, bonus_at AS bonusAt FROM participations WHERE event=? AND (base_at IS NOT NULL OR bonus_at IS NOT NULL) ORDER BY COALESCE(bonus_at, base_at) DESC, code ASC LIMIT ? OFFSET ?').all(config.eventId, limit, offset);
    },
    stats() { return db.prepare('SELECT COUNT(*) AS participants, COUNT(base_at) AS redeemed, COUNT(bonus_at) AS extras FROM participations WHERE event=?').get(config.eventId); },
    close() { db.close(); },
  };
}
