import { lines, questions } from './content.js';

// Fixed axes and scale keep different results visually comparable.
export function renderRadar(result) {
  const maximum = questions.length;
  const center = { x: 160, y: 140 };
  const radius = 116;
  const point = (axis, score) => {
    const angle = -Math.PI / 2 + axis * 2 * Math.PI / lines.length;
    return [center.x + Math.cos(angle) * radius * score / maximum, center.y + Math.sin(angle) * radius * score / maximum];
  };
  const coordinates = values => values.map(value => value.toFixed(2)).join(',');
  const scores = lines.map(line => result.ranking.find(item => item.id === line.id).score);
  const description = lines.map((line, axis) => `${line.name}: ${scores[axis]} de ${maximum}`).join('. ');
  return `<figure class="curiosity-radar">
    <div class="radar-canvas">
      <svg class="radar-chart" viewBox="0 0 320 260" role="img" aria-labelledby="radar-title radar-description">
        <title id="radar-title">Tu curiosidad en las tres líneas de investigación</title>
        <desc id="radar-description">${description}. Escala de 0 en el centro a ${maximum} en cada extremo.</desc>
        <g class="radar-grid" aria-hidden="true">${Array.from({ length: maximum }, (_, level) => `<polygon points="${lines.map((_, axis) => coordinates(point(axis, level + 1))).join(' ')}"/>`).join('')}</g>
        <g class="radar-axes" aria-hidden="true">${lines.map((_, axis) => { const end = point(axis, maximum); return `<line x1="${center.x}" y1="${center.y}" x2="${end[0].toFixed(2)}" y2="${end[1].toFixed(2)}"/>`; }).join('')}</g>
        <g class="radar-result" aria-hidden="true">
          <polygon class="radar-area" points="${scores.map((score, axis) => coordinates(point(axis, score))).join(' ')}"/>
          ${scores.map((score, axis) => { const dot = point(axis, score); return `<circle class="radar-point" data-line="${lines[axis].id}" data-score="${score}" cx="${dot[0].toFixed(2)}" cy="${dot[1].toFixed(2)}" r="4"/>`; }).join('')}
        </g>
      </svg>
      ${lines.map((line, axis) => `<div class="radar-label radar-label-${axis}" aria-hidden="true"><span>${line.name}</span><strong>${scores[axis]} / ${maximum}</strong></div>`).join('')}
    </div>
    <figcaption>Del centro hacia afuera: de 0 a ${maximum} elecciones por línea.</figcaption>
  </figure>`;
}
