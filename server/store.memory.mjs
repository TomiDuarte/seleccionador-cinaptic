import { createHash, randomBytes } from 'node:crypto';
import { calculateResult, validAnswers, validCareer } from '../public/quiz.js';
export function createMemoryStore() {
  const participations = new Map();
  const sessions = new Map();
  const hash = key => createHash('sha256').update(key).digest('hex');
  const byToken = new Map();
  const expose = row => row ? {
    code: row.code,
    career: row.career,
    answers: row.answers,
    createdAt: row.createdAt,
    baseAt: row.baseAt,
    bonusAt: row.bonusAt,
    result: calculateResult(row.answers),
  } : null;

  return {
    issue(key, career, answers) {
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key) || !validCareer(career) || !validAnswers(answers)) {
        throw Object.assign(new Error('Revisá la carrera y las respuestas.'), { status: 400 });
      }
      const tokenHash = hash(key);
      if (byToken.has(tokenHash)) return expose(byToken.get(tokenHash));

      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code;
      do {
        const bytes = randomBytes(10);
        const chars = [...bytes].map(b => alphabet[b % alphabet.length]).join('');
        code = `CN-${chars.slice(0, 5)}-${chars.slice(5)}`;
      } while (participations.has(code));

      const row = {
        code,
        career,
        answers,
        createdAt: new Date().toISOString(),
        baseAt: null,
        bonusAt: null,
      };
      participations.set(code, row);
      byToken.set(tokenHash, row);
      return expose(row);
    },
    own(key) {
      if (!/^[a-f0-9]{64}$/.test(key || '')) return null;
      return expose(byToken.get(hash(key)));
    },
    lookup(code) {
      return expose(participations.get(code));
    },
    redeem(code, kind, confirmed) {
      if (!['base', 'bonus'].includes(kind)) throw Object.assign(new Error('Premio inválido.'), { status: 400 });
      if (kind === 'bonus' && confirmed !== true) throw Object.assign(new Error('Confirmá que viste el mensaje compartido.'), { status: 400 });
      const row = participations.get(code);
      if (!row) throw Object.assign(new Error('No encontramos ese código.'), { status: 404 });
      if (kind === 'base') {
        if (row.baseAt) throw Object.assign(new Error('Este premio ya fue canjeado.'), { status: 409 });
        row.baseAt = new Date().toISOString();
      } else {
        if (!row.baseAt) throw Object.assign(new Error('Falta entregar el premio inicial.'), { status: 409 });
        if (row.bonusAt) throw Object.assign(new Error('Este premio ya fue canjeado.'), { status: 409 });
        row.bonusAt = new Date().toISOString();
      }
      return expose(row);
    },
    stats() {
      const rows = [...participations.values()];
      return {
        participants: rows.length,
        redeemed: rows.filter(row => row.baseAt).length,
        extras: rows.filter(row => row.bonusAt).length,
      };
    },
    close() {},
    createSession(token, expiresAt) {
      sessions.set(hash(token), expiresAt);
    },
    authenticated(token) {
      if (!/^[a-f0-9]{64}$/.test(token || '')) return false;
      const expiresAt = sessions.get(hash(token));
      if (!expiresAt || expiresAt <= Date.now()) {
        sessions.delete(hash(token));
        return false;
      }
      return true;
    },
    logout(token) {
      if (token) sessions.delete(hash(token));
    },
  };
}
