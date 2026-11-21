import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateResult, validAnswers, validCareer } from '../public/quiz.js';
import { lines, questions } from '../public/content.js';

test('cada línea puede ganar con las seis respuestas afines', () => {
  for (const line of lines) {
    const answers = questions.map(q => q.options.findIndex(o => o.line === line.id));
    const result = calculateResult(answers);
    assert.deepEqual(result.topIds, [line.id]);
    assert.equal(result.ranking[0].score, 6);
  }
});
test('los empates se muestran completos sin desempate arbitrario', () => {
  const answers = questions.map((q, i) => q.options.findIndex(o => o.line === lines[i % 3].id));
  const result = calculateResult(answers);
  assert.equal(result.topIds.length, 3);
  assert.deepEqual(result.ranking.map(r => r.score), [2, 2, 2]);
});
test('los 729 recorridos posibles conservan todos los votos y sus ganadores', () => {
  for (let n = 0; n < 729; n++) {
    const answers = questions.map((_, i) => Math.floor(n / 3 ** i) % 3);
    const result = calculateResult(answers);
    assert.equal(result.ranking.reduce((sum, line) => sum + line.score, 0), 6);
    for (const id of result.topIds) assert.equal(result.ranking.find(r => r.id === id).score, result.ranking[0].score);
  }
});
test('rechaza respuestas incompletas o manipuladas; admite visitantes sin carrera', () => {
  for (const value of [null, [], [0,0,0,0,0,3], [0,0,0,0,0,'1'], [0,0,0,0,0,null]]) assert.equal(validAnswers(value), false);
  assert.equal(validAnswers([null,null,null,null,null,null], false), true);
  assert.equal(validCareer('secundaria'), true);
  assert.equal(validCareer('inventada'), false);
});
