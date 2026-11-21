import { careers, lines, questions } from './content.js';

export function validAnswers(answers, complete = true) {
  return Array.isArray(answers) && answers.length === questions.length &&
    answers.every((answer, i) => (!complete && answer === null) ||
      (Number.isInteger(answer) && answer >= 0 && answer < questions[i].options.length));
}

export function validCareer(career) { return careers.some(([id]) => id === career); }

export function calculateResult(answers) {
  if (!validAnswers(answers)) throw new Error('Completá todas las preguntas.');
  const scores = Object.fromEntries(lines.map(line => [line.id, 0]));
  answers.forEach((answer, i) => { scores[questions[i].options[answer].line] += 1; });
  const ranking = lines.map(line => ({ id: line.id, score: scores[line.id] }))
    .sort((a, b) => b.score - a.score || lines.findIndex(l => l.id === a.id) - lines.findIndex(l => l.id === b.id));
  return { ranking, topIds: ranking.filter(line => line.score === ranking[0].score).map(line => line.id) };
}
