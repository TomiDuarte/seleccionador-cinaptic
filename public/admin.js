import { careers } from './content.js';

const content = document.querySelector('#admin-content');
const errorBox = document.querySelector('#admin-error');
const statusBox = document.querySelector('#admin-status');
let current = null;
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const date = value => new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });
async function api(path, data) {
  const response = await fetch(`/api/admin/${path}`, { method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) { if (response.status === 401 && path !== 'login') login(); throw new Error(result.error); }
  return result;
}
function showError(error) { errorBox.textContent = error.name === 'TypeError' || error.name === 'TimeoutError' ? 'Sin conexión con el servidor. Consultá nuevamente el código antes de entregar el premio.' : error.message; }
function clearMessages() { errorBox.textContent = ''; statusBox.textContent = ''; }
function login() {
  current = null;
  content.innerHTML = `<form id="login-form" class="admin-card"><label class="field-label" for="password">Contraseña del equipo</label><input type="password" id="password" autocomplete="current-password" required><button class="button full" type="submit">Ingresar al panel</button><p class="privacy-note">Acceso reservado al equipo que entrega los premios.</p></form>`;
  document.querySelector('#login-form').onsubmit = async event => {
    event.preventDefault(); clearMessages(); const button = event.target.querySelector('button'); button.disabled = true;
    try { await api('login', { password: document.querySelector('#password').value }); await dashboard(); }
    catch (error) { showError(error); button.disabled = false; }
  };
}
async function dashboard() {
  const stats = await api('stats');
  content.innerHTML = `<div class="stats"><div class="stat"><strong id="total">${stats.participants}</strong><span>Participantes</span></div><div class="stat"><strong id="redeemed">${stats.redeemed}</strong><span>Premios iniciales</span></div><div class="stat"><strong id="extras">${stats.extras}</strong><span>Extras</span></div></div><section class="admin-card"><form class="admin-search" id="search-form"><div><label class="field-label" for="code">Código del participante</label><input id="code" type="text" placeholder="CN-XXXXX-XXXXX" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="14" required></div><button class="button" type="submit">Consultar</button></form><div id="coupon"></div></section><button class="text-button" id="logout">Cerrar sesión</button>`;
  document.querySelector('#code').addEventListener('input', () => { current = null; document.querySelector('#coupon').innerHTML = ''; clearMessages(); });
  document.querySelector('#logout').insertAdjacentHTML('beforebegin', `<section class="admin-card"><button class="button secondary full" id="show-redeemed" type="button" aria-expanded="false" aria-controls="redeemed-history">Ver ya canjeados</button><div id="redeemed-history" hidden></div></section>`);
  document.querySelector('#show-redeemed').onclick = async event => {
    const panel = document.querySelector('#redeemed-history');
    panel.hidden = !panel.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
    event.currentTarget.textContent = panel.hidden ? 'Ver ya canjeados' : 'Ocultar ya canjeados';
    if (!panel.hidden) await loadRedeemed();
  };
  document.querySelector('#search-form').onsubmit = async event => {
    event.preventDefault(); clearMessages(); current = null; document.querySelector('#coupon').innerHTML = '';
    const button = event.target.querySelector('button'); button.disabled = true;
    const code = document.querySelector('#code').value.trim().toUpperCase();
    try { const found = await api(`coupon?code=${encodeURIComponent(code)}`); if (document.querySelector('#code')?.value.trim().toUpperCase() === code) { current = found; renderCoupon(); } }
    catch (error) { showError(error); } finally { button.disabled = false; }
  };
  document.querySelector('#logout').onclick = async () => { try { await api('logout', {}); clearMessages(); login(); } catch (error) { showError(error); } };
}
let historyRequest = 0;
async function loadRedeemed(offset = 0) {
  const panel = document.querySelector('#redeemed-history');
  if (!panel || panel.hidden) return;
  const revision = ++historyRequest;
  panel.innerHTML = '<p role="status">Cargando canjes…</p>';
  try {
    const { items, hasMore } = await api(`redeemed?offset=${offset}`);
    if (!panel.isConnected || revision !== historyRequest) return;
    panel.innerHTML = `<h2 class="history-title">Participantes que ya canjearon</h2><p>Canjes guardados de esta edición, del más reciente al más antiguo. Horarios de Argentina.</p>
      ${items.length ? `<ul class="redeemed-list">${items.map(ticket => `<li><h3>${esc(ticket.name || 'Sin nombre registrado')}</h3><p>${esc(careers.find(([id]) => id === ticket.career)?.[1] || ticket.career)}</p><code>${esc(ticket.code)}</code><dl class="participant-details"><dt>Premio inicial</dt><dd>${ticket.baseAt ? esc(date(ticket.baseAt)) : 'Sin canjear'}</dd><dt>Premio extra</dt><dd>${ticket.bonusAt ? esc(date(ticket.bonusAt)) : 'Sin canjear'}</dd></dl></li>`).join('')}</ul>` : '<p role="status">Todavía no hay canjes en esta página.</p>'}
      <div class="history-actions"><button class="button secondary" type="button" id="refresh-redeemed">Actualizar listado</button>${offset ? '<button class="button secondary" type="button" id="previous-redeemed">Anteriores</button>' : ''}${hasMore ? '<button class="button secondary" type="button" id="next-redeemed">Siguientes</button>' : ''}</div><p class="history-page">Página ${offset / 50 + 1}</p>`;
    panel.querySelector('#refresh-redeemed').onclick = () => loadRedeemed(offset);
    panel.querySelector('#previous-redeemed')?.addEventListener('click', () => loadRedeemed(offset - 50));
    panel.querySelector('#next-redeemed')?.addEventListener('click', () => loadRedeemed(offset + 50));
  } catch (error) {
    if (!panel.isConnected || revision !== historyRequest) return;
    panel.innerHTML = '<p class="error" role="alert"></p><button class="button secondary" type="button">Reintentar listado</button>';
    panel.querySelector('p').textContent = error.message;
    panel.querySelector('button').onclick = () => loadRedeemed(offset);
  }
}
function renderCoupon() {
  const ticket = current;
  document.querySelector('#coupon').innerHTML = `<div class="redeem-row"><p class="admin-code">${esc(ticket.code)}</p><p class="muted">Participación registrada: ${date(ticket.createdAt)}</p></div><div class="redeem-row"><h3>Premio por participar</h3>${ticket.baseAt ? `<p class="done">Canjeado · ${date(ticket.baseAt)}</p>` : '<p>Disponible para entregar.</p><button class="button mint full" id="redeem-base">Confirmar canje inicial</button>'}</div><div class="redeem-row"><h3>Extra por compartir</h3>${ticket.bonusAt ? `<p class="done">Canjeado · ${date(ticket.bonusAt)}</p>` : `<p>${ticket.baseAt ? 'Verificá el mensaje o la publicación antes de entregar el extra.' : 'Primero confirmá el canje inicial.'}</p><label><input type="checkbox" id="confirmed" ${!ticket.baseAt ? 'disabled' : ''}><span>Vi el mensaje o la publicación compartida con la experiencia.</span></label><button class="button secondary full" id="redeem-bonus" disabled>Confirmar canje extra</button>`}</div>`;
  document.querySelector('.admin-code').insertAdjacentHTML('afterend', `<dl class="participant-details"><dt>Nombre</dt><dd>${esc(ticket.name || 'Sin nombre registrado (participación anterior)')}</dd><dt>Carrera o etapa</dt><dd>${esc(careers.find(([id]) => id === ticket.career)?.[1] || ticket.career)}</dd></dl>`);
  document.querySelector('#redeem-base')?.addEventListener('click', () => redeem('base'));
  document.querySelector('#confirmed')?.addEventListener('change', event => { document.querySelector('#redeem-bonus').disabled = !event.target.checked; });
  document.querySelector('#redeem-bonus')?.addEventListener('click', () => redeem('bonus'));
}
async function redeem(kind) {
  clearMessages(); const code = current.code;
  const confirmed = document.querySelector('#confirmed')?.checked === true;
  document.querySelectorAll('#coupon button').forEach(button => { button.disabled = true; });
  try {
    const updated = await api('redeem', { code, kind, confirmed });
    if (current?.code === code) { current = updated; renderCoupon(); }
    statusBox.textContent = `Canje ${kind === 'base' ? 'inicial' : 'extra'} registrado para ${code}. Ya podés entregar el premio.`;
    const stats = await api('stats');
    document.querySelector('#total').textContent = stats.participants;
    document.querySelector('#redeemed').textContent = stats.redeemed;
    document.querySelector('#extras').textContent = stats.extras;
    await loadRedeemed();
  } catch (error) {
    showError(error);
    // A timeout can happen after the server commits: always reload before another delivery.
    try { const updated = await api(`coupon?code=${encodeURIComponent(code)}`); if (current?.code === code) { current = updated; renderCoupon(); } } catch { /* Keep actions disabled until a successful new lookup. */ }
  }
}
try { await dashboard(); } catch (error) { login(); if (!error.message.includes('Ingresá')) showError(error); }
