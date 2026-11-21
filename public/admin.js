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
  document.querySelector('#search-form').onsubmit = async event => {
    event.preventDefault(); clearMessages(); current = null; document.querySelector('#coupon').innerHTML = '';
    const button = event.target.querySelector('button'); button.disabled = true;
    const code = document.querySelector('#code').value.trim().toUpperCase();
    try { const found = await api(`coupon?code=${encodeURIComponent(code)}`); if (document.querySelector('#code')?.value.trim().toUpperCase() === code) { current = found; renderCoupon(); } }
    catch (error) { showError(error); } finally { button.disabled = false; }
  };
  document.querySelector('#logout').onclick = async () => { try { await api('logout', {}); clearMessages(); login(); } catch (error) { showError(error); } };
}
function renderCoupon() {
  const ticket = current;
  document.querySelector('#coupon').innerHTML = `<div class="redeem-row"><p class="admin-code">${esc(ticket.code)}</p><p class="muted">Participación registrada: ${date(ticket.createdAt)}</p></div><div class="redeem-row"><h3>Premio por participar</h3>${ticket.baseAt ? `<p class="done">Canjeado · ${date(ticket.baseAt)}</p>` : '<p>Disponible para entregar.</p><button class="button mint full" id="redeem-base">Confirmar canje inicial</button>'}</div><div class="redeem-row"><h3>Extra por compartir</h3>${ticket.bonusAt ? `<p class="done">Canjeado · ${date(ticket.bonusAt)}</p>` : `<p>${ticket.baseAt ? 'Verificá el mensaje enviado antes de entregar el extra.' : 'Primero confirmá el canje inicial.'}</p><label><input type="checkbox" id="confirmed" ${!ticket.baseAt ? 'disabled' : ''}><span>Vi el mensaje de WhatsApp compartido con la experiencia.</span></label><button class="button secondary full" id="redeem-bonus" disabled>Confirmar canje extra</button>`}</div>`;
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
  } catch (error) {
    showError(error);
    // A timeout can happen after the server commits: always reload before another delivery.
    try { const updated = await api(`coupon?code=${encodeURIComponent(code)}`); if (current?.code === code) { current = updated; renderCoupon(); } } catch { /* Keep actions disabled until a successful new lookup. */ }
  }
}
try { await dashboard(); } catch (error) { login(); if (!error.message.includes('Ingresá')) showError(error); }
