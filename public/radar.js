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
      <svg class="radar-chart" viewBox="0 0 320 250" role="img" aria-labelledby="radar-title radar-description">
        <title id="radar-title">Tu curiosidad en las tres líneas de investigación</title>
        <desc id="radar-description">Gráfico con silueta de sombrero. ${description}. Escala de 0 en el centro a ${maximum} en cada extremo.</desc>
        <defs>
          <radialGradient id="radar-halo"><stop stop-color="#a995ef" stop-opacity=".16"/><stop offset=".6" stop-color="#63cfe3" stop-opacity=".07"/><stop offset="1" stop-color="#63cfe3" stop-opacity="0"/></radialGradient>
          <linearGradient id="radar-fill" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#c4a9fa" stop-opacity=".66"/><stop offset="1" stop-color="#65cee3" stop-opacity=".2"/></linearGradient>
          <linearGradient id="radar-hat-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c7a6f4" stop-opacity=".4"/><stop offset="1" stop-color="#775598" stop-opacity=".2"/></linearGradient>
          <linearGradient id="radar-brim-fill"><stop stop-color="#b592e4"/><stop offset="1" stop-color="#6e4b8d"/></linearGradient>
        </defs>
        <ellipse class="radar-halo" cx="160" cy="132" rx="140" ry="108" fill="url(#radar-halo)" aria-hidden="true"/>
        <g class="radar-hat" aria-hidden="true">
          <ellipse class="radar-hat-shadow" cx="160" cy="237" rx="102" ry="7"/>
          <path class="radar-hat-brim" d="M28 207C43 192 95 186 160 187s115 9 133 24c17 16-28 28-130 26S9 225 28 207Z"/>
          <path class="radar-hat-crown" d="M53 201C84 145 119 67 153 24c10-13 32-16 53-11-23 8-30 20-27 39 12 42 51 96 88 151-59 21-153 23-214-2Z"/>
          <path class="radar-hat-band" d="M63 183Q160 208 254 184l13 19c-59 21-153 23-214-2Z"/>
          <rect class="radar-hat-buckle" x="147" y="198" width="27" height="18" rx="4" transform="rotate(3 160 207)"/>
        </g>
        <g class="radar-grid" aria-hidden="true">${Array.from({ length: maximum }, (_, level) => `<polygon points="${lines.map((_, axis) => coordinates(point(axis, level + 1))).join(' ')}"/>`).join('')}</g>
        <g class="radar-axes" aria-hidden="true">${lines.map((_, axis) => { const end = point(axis, maximum); return `<line x1="${center.x}" y1="${center.y}" x2="${end[0].toFixed(2)}" y2="${end[1].toFixed(2)}"/>`; }).join('')}</g>
        <g aria-hidden="true">${lines.map((_, axis) => { const end = point(axis, maximum); return `<circle class="radar-anchor radar-axis-${axis}" cx="${end[0].toFixed(2)}" cy="${end[1].toFixed(2)}" r="3"/>`; }).join('')}</g>
        <g class="radar-result" aria-hidden="true">
          <polygon class="radar-area" points="${scores.map((score, axis) => coordinates(point(axis, score))).join(' ')}"/>
          ${scores.map((score, axis) => { const dot = point(axis, score); return `<circle class="radar-point-glow radar-axis-${axis}" cx="${dot[0].toFixed(2)}" cy="${dot[1].toFixed(2)}" r="8"/><circle class="radar-point radar-axis-${axis}" data-line="${lines[axis].id}" data-score="${score}" cx="${dot[0].toFixed(2)}" cy="${dot[1].toFixed(2)}" r="4"/>`; }).join('')}
        </g>
      </svg>
      ${lines.map((line, axis) => `<div class="radar-label radar-label-${axis} radar-axis-${axis}${result.topIds.includes(line.id) ? ' is-top' : ''}" aria-hidden="true"><span class="radar-name">${line.name}</span><strong>${scores[axis]} <span>/ ${maximum}</span></strong></div>`).join('')}
    </div>
    <figcaption>0 en el centro <span aria-hidden="true">·</span> ${maximum} en los extremos</figcaption>
  </figure>`;
}
