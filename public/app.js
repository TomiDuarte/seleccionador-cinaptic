import { config, lines, careers, questions } from './content.js';
import { calculateResult, validAnswers, validCareer } from './quiz.js';

const main = document.querySelector('main');
const storageKey = `cinaptic:${config.eventId}:v1`;
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paths = {
  network: '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="m10 8-4 8m8-8 4 8M8 19h8"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  intelligence: '<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4Z"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8C3 9 5 0 9 3l3 5Zm0 0c9 1 7-8 3-5l-3 5Z"/>',
  chat: '<path d="M21 11a9 9 0 0 1-9 9c-2 0-3-.3-5-1l-5 2 2-5a9 9 0 1 1 17-5Z"/><path d="M8 11h8M8 7h5M8 15h5"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
const blankState = () => ({ key: [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join(''), career: '', answers: questions.map(() => null), step: 0, ticket: null, retaking: false });
let state = blankState();
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && /^[a-f0-9]{64}$/.test(saved.key) && validAnswers(saved.answers, false) &&
      (saved.career === '' || validCareer(saved.career)) && Number.isInteger(saved.step) && saved.step >= 0 && saved.step <= questions.length) {
    state = { ...saved, ticket: saved.ticket && /^CN-[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(saved.ticket.code) && validAnswers(saved.ticket.answers) ? { ...saved.ticket, result: calculateResult(saved.ticket.answers) } : null };
  }
} catch { storageAvailable = false; }
state.retaking = state.retaking === true && !!state.ticket;
function persist() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { storageAvailable = false; } }
persist();
let toastTimer;
function toast(message) { document.querySelector('#toast').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { document.querySelector('#toast').textContent = ''; }, 5000); }
function focusHeading() { const heading = main.querySelector('h1'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } window.scrollTo(0, 0); }
function renderHome() {
  const action = state.ticket ? 'Volver a mi resultado' : state.career ? 'Continuar mi descubrimiento' : 'Descubrir mi línea';
  main.innerHTML = `
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
      <h1 id="hero-title">Tu curiosidad<br>tiene un <span>lugar.</span></h1>
      <p>Ponete el sombrero de la investigación y descubrí qué línea del CInApTIC conecta con vos.</p>
      <a class="button" href="#${state.ticket ? 'resultado' : 'quiz'}">${icon('spark')}${action}</a>
      ${state.ticket ? `<button class="button secondary retake-button" type="button" id="retake-quiz">${state.retaking ? 'Continuar el quiz' : 'Volver a responder el quiz'}</button><p class="micro">Conservás tu código y los premios ya canjeados.</p>` : ''}</div>
      <div class="hero-art"><img src="/hat.svg" width="560" height="520" alt="Un sombrero violeta entre órbitas y estrellas, listo para descubrir tu curiosidad.">${(state.ticket ? lines.map(line => line.name) : ['Tu curiosidad', 'Tus ideas', 'Tu próximo descubrimiento']).map((label, i) => `<span class="orbit-tag t${i + 1}">${label}</span>`).join('')}<span class="art-caption">Tu próxima gran idea empieza con curiosidad.</span></div>
    </section>
    <section class="journey" aria-label="Cómo participar">
      <div class="journey-item">${icon('chat')}<div><strong>Contanos qué te mueve</strong><p>Tu carrera y 6 preguntas cortitas.</p></div></div>
      <div class="journey-item">${icon('spark')}<div><strong>Encontrá tu conexión</strong><p>Una línea para empezar a explorar.</p></div></div>
      <div class="journey-item">${icon('gift')}<div><strong>Llevate algo dulce</strong><p>Mostrá tu código en el stand.</p></div></div>
    </section>
    ${renderLines()}
    <section class="invitation"><div><h2>No necesitás tener todas las respuestas.</h2><p>Traé tus preguntas. Acercate al stand, conocé al equipo y conversemos sobre cómo podrías participar.</p></div><a class="button" href="#quiz">Me sumo a explorar</a></section>
    <section class="faq"><h2>Antes de ponerte el sombrero…</h2>
      <details><summary>¿Tengo que estudiar Sistemas para participar?</summary><p>No. El juego está abierto a todas las carreras y a quienes todavía están eligiendo. Tu carrera no limita el resultado. En el stand podés consultar las posibilidades de participación en el centro.</p></details>
      <details><summary>¿Cómo canjeo el premio y el extra?</summary><p>Al terminar recibís un código. Mostralo en el stand para canjearlo por ${config.reward}, sujeto a disponibilidad. Cada código admite un canje inicial y uno extra. Para el extra, compartí la experiencia por WhatsApp, Instagram u otra red y mostrá el mensaje o la publicación al equipo.</p></details>
      <details><summary>¿El resultado decide dónde puedo investigar?</summary><p>Es una recomendación lúdica a partir de tus intereses, no una evaluación vocacional ni una asignación al centro. Las preguntas y sus puntajes se diseñaron para esta experiencia. Si te interesan varias líneas, ¡conversemos sobre todas!</p></details>
    </section>`;
  document.querySelector('#retake-quiz')?.addEventListener('click', () => {
    if (!state.retaking) {
      ticketRevision++;
      state.retaking = true;
      state.answers = questions.map(() => null);
      state.step = 0;
      persist();
    }
    location.hash = 'quiz';
  });
  animateDiscoveries();
}

function renderLines() {
  if (!state.ticket) return `<section class="lines-section discovery-locked" id="lineas" aria-labelledby="lines-title">
    <div class="mystery-orbit" aria-hidden="true"><span>✦</span><span>?</span><span>✧</span></div>
    <div><span class="eyebrow">Primero, seguí tu intuición</span><h2 id="lines-title">Hay tres caminos.<br>El tuyo empieza con vos.</h2><p>Respondé el quiz y después descubrí las tres líneas de investigación. Dejemos que tu curiosidad hable primero.</p><a class="button secondary" href="#quiz">${state.career ? 'Continuar el cuestionario' : 'Empezar el cuestionario'}</a></div>
  </section>`;
  return `<section class="lines-section discovery-unlocked" id="lineas" aria-labelledby="lines-title">
    <div class="section-intro"><div><span class="eyebrow">Tu curiosidad abrió estas puertas</span><h2 id="lines-title">Tres caminos.<br>Un mundo por descubrir.</h2></div><p>Ya conocés tu conexión. Ahora acercate a cada línea y descubrí dónde podrían crecer tus ideas.</p></div>
    <div class="discovery-trail">${lines.map(line => `<article class="line-card discovery-card ${line.id}">
      <div class="line-universe" aria-hidden="true"><div class="universe-ring"></div><div class="line-icon">${icon(line.icon)}</div><span class="universe-spark">✦</span><span class="universe-moon"></span></div>
      <div class="line-story">${state.ticket.result.topIds.includes(line.id) ? '<span class="connection-label">Tu conexión con el sombrero</span>' : ''}<h3>${line.name}</h3><p class="tagline">${line.label}</p><p class="description">${line.description}</p><div class="tags">${line.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div><details><summary>Una idea para investigar</summary><p>${line.challenge}</p><p>${line.project}</p></details></div>
    </article>`).join('')}</div>
    <p class="about-note"><a href="${config.officialUrl}" target="_blank" rel="noopener noreferrer">Ver proyectos en la web oficial</a></p>
  </section>`;
}

let discoveryObserver;
function animateDiscoveries() {
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  discoveryObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.animate([{ opacity: .3, transform: 'translateY(26px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.22,.8,.35,1)' });
      entry.target.classList.add('discovered');
      discoveryObserver.unobserve(entry.target);
    }
  }, { threshold: .12 });
  main.querySelectorAll('.discovery-card, .discovery-locked, .journey-item').forEach(element => discoveryObserver.observe(element));
}

const encouragement = [
  '¡Toda gran idea empieza con alguien curioso como vos!',
  'Mmm… ¡presiento que vas a desarrollar grandes ideas!',
  '¡¿Acaso serás el próximo heredero de una gran idea!?',
  '¡Esa curiosidad merece un lugar en el laboratorio!',
  '¡Ya siento tu espíritu de investigación!',
  '¡Estás a un pasito de encontrar tu próxima aventura!',
  '¡Una última pista y descubrimos tu conexión!',
];
const goalLabels = ['Tu descubrimiento empieza acá', '¡Ya diste el primer paso!', '¡Tu curiosidad toma impulso!', '¡Estás avanzando genial!', '¡Ya pasaste la mitad!', '¡La meta está muy cerca!', '¡Última respuesta para descubrir tu línea!'];
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let submitting = false;
let celebrateResult = false;
let ticketRevision = 0;
function renderQuiz(previousStep = state.step) {
  if (state.ticket && !state.retaking) { location.hash = 'resultado'; return; }
  const step = state.step;
  const question = questions[step - 1];
  main.innerHTML = `<section class="quiz-shell"><div class="quiz-top"><button class="close-button" id="exit-quiz" type="button" aria-label="Salir del cuestionario">×</button><div class="goal-progress"><div class="progress" role="progressbar" aria-label="Progreso hacia tu resultado" aria-valuemin="0" aria-valuemax="7" aria-valuenow="${step}" aria-valuetext="${step} de 7 etapas completadas"><div class="progress-fill step-${step}"></div></div><span class="goal-prize ${step >= 5 ? 'almost' : ''}" aria-hidden="true">${icon('gift')}</span></div></div><p class="goal-caption">${goalLabels[step]}</p>
    <div class="hat-coach ${previousStep < step ? 'cheering' : ''}"><img src="/hat.svg" width="560" height="520" alt=""><p class="hat-speech" role="status">${encouragement[step]}</p></div><div class="question-content ${previousStep < step ? 'question-arriving' : ''}">
    <span class="eyebrow">${step ? 'Seguí tu curiosidad' : 'Primero, nos conocemos'}</span>
    <h1>${step ? question.title : '¿Qué estás estudiando?'}</h1><p class="question-subtitle">${step ? question.subtitle : 'Todas las curiosidades tienen lugar. Contanos desde dónde venís.'}</p>
    <form id="quiz-form">${step ? `<fieldset class="options"><legend class="sr-only">${question.title}</legend>${question.options.map((option, i) => `<label class="option"><input type="radio" name="answer" value="${i}" ${state.answers[step - 1] === i ? 'checked' : ''} required><span>${option.text}</span></label>`).join('')}</fieldset>` : `<label class="field-label" for="career">Tu carrera o etapa</label><div class="select-wrap"><select name="career" id="career" required><option value="">Elegí una opción</option>${careers.map(([id, name]) => `<option value="${id}" ${state.career === id ? 'selected' : ''}>${name}</option>`).join('')}</select></div><p class="career-note">${icon('spark')} No necesitás experiencia en investigación. Tu carrera no determina tu resultado.</p>`}
    <div id="quiz-error" class="error" role="alert"></div><div class="quiz-actions">${step ? '<button class="text-button" type="button" id="back">Volver</button>' : ''}<button class="button" type="submit" id="next" ${step ? state.answers[step - 1] === null ? 'disabled' : '' : !state.career ? 'disabled' : ''}>${step === questions.length ? 'Descubrir mi resultado' : 'Continuar'}</button></div></form>
    </div></section>`;
  if (previousStep !== step && !reducedMotion()) {
    document.querySelector('.progress-fill').animate([{ width: `${previousStep / 7 * 100}%` }, { width: `${step / 7 * 100}%` }], { duration: 450, easing: 'ease-out' });
  }
  document.querySelector('#exit-quiz').onclick = () => confirmExit();
  document.querySelector('#quiz-form').addEventListener('change', event => {
    if (event.target.name === 'career') state.career = event.target.value;
    else state.answers[step - 1] = Number(event.target.value);
    document.querySelector('#next').disabled = false; persist();
  });
  document.querySelector('#back')?.addEventListener('click', () => { state.step--; persist(); renderQuiz(step); focusHeading(); });
  document.querySelector('#quiz-form').onsubmit = async event => {
    event.preventDefault();
    if (submitting || (!step && !validCareer(state.career))) return;
    if (step && state.answers[step - 1] === null) return;
    if (step < questions.length) { state.step++; persist(); renderQuiz(step); focusHeading(); return; }
    submitting = true;
    const button = document.querySelector('#next'); button.disabled = true; button.textContent = 'Consultando al sombrero…';
    document.querySelector('#back').disabled = true;
    const reveal = document.querySelector('#reveal-dialog');
    reveal.showModal();
    document.querySelector('.progress-fill').className = 'progress-fill step-7';
    document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', '7');
    document.querySelector('[role="progressbar"]').setAttribute('aria-valuetext', 'Todas las etapas completadas');
    try {
      const [ticket] = await Promise.all([
        submitParticipation(),
        new Promise(resolve => setTimeout(resolve, 3500)),
      ]);
      ticketRevision++;
      state.ticket = ticket; state.retaking = false; persist();
      reveal.close();
      if (location.hash === '#quiz') { celebrateResult = true; location.hash = 'resultado'; }
    } catch (error) {
      reveal.close();
      const errorBox = document.querySelector('#quiz-error');
      if (errorBox) { errorBox.textContent = error.message; button.disabled = false; button.textContent = 'Reintentar'; document.querySelector('#back').disabled = false; button.focus(); }
    } finally { submitting = false; }
  };
}

async function api(path, options = {}) {
  let response;
  try { response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(15000) }); }
  catch { throw new Error('No pudimos conectar. Tus respuestas siguen acá: comprobá tu conexión y volvé a intentar.'); }
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'No pudimos completar la operación.'), { status: response.status, code: data.code });
  return data;
}

async function submitParticipation() {
  const body = { eventId: config.eventId, key: state.key, career: state.career, answers: [...state.answers] };
  try {
    return await api(state.retaking ? '/api/participations/retake' : '/api/participations', { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    if (!state.retaking || !state.ticket || (error.status !== 404 && error.code !== 'STORAGE_UNAVAILABLE')) throw error;
    // Old test records may be gone. Keep the original coupon and redemption history;
    // only the recommendation can be calculated locally. Never issue a replacement.
    return { ...state.ticket, career: body.career, answers: body.answers, result: calculateResult(body.answers), syncPending: true, couponUnavailable: true };
  }
}

function ticketHeading(ticket) {
  return ticket.couponUnavailable ? 'Tu código necesita revisión' : ticket.baseAt ? '¡Premio inicial canjeado!' : 'La curiosidad tiene premio.';
}
function ticketMessage(ticket) {
  return ticket.couponUnavailable ? 'Tu resultado está guardado en este navegador. Conservamos el código original, pero no pudimos verificar su registro de canje. Acercate al stand para revisarlo; repetir el quiz no genera otro premio.' : ticket.baseAt ? 'Este código ya registró su primer canje.' : 'Mostrá este código en el stand del CInApTIC y canjealo por un dulce premio';
}

function renderResult() {
  if (!state.ticket) { location.hash = 'quiz'; return; }
  const ticket = state.ticket;
  const matching = ticket.result.topIds.map(id => lines.find(line => line.id === id));
  const tied = matching.length > 1;
  main.innerHTML = `<section class="result-shell ${celebrateResult ? 'celebrating' : ''}"><header class="result-header">${celebrateResult ? '<div class="celebration" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span></div>' : ''}<div class="result-star" aria-hidden="true">✦</div><span class="eyebrow">El sombrero encontró tu conexión</span><h1>${tied ? '¡Curiosidad sin fronteras!' : matching[0].name}</h1><p>${tied ? `Tus respuestas conectan por igual con ${matching.map(line => line.name).join(' y ')}. Tenés más de un camino para explorar.` : matching[0].match}</p></header>
    <div class="result-grid"><section class="result-panel"><h2>Lo que despertó tu curiosidad</h2><p>Así se repartieron tus ${questions.length} elecciones. Es una invitación a explorar.</p>${ticket.result.ranking.map(item => `<div class="score-row"><span>${lines.find(line => line.id === item.id).name}</span><span>${item.score} de ${questions.length}</span></div><progress class="score-bar" max="${questions.length}" value="${item.score}" aria-label="${lines.find(line => line.id === item.id).name}: ${item.score} de ${questions.length}"></progress>`).join('')}<div class="result-project">${matching.map(line => `<p><strong>${line.name}</strong><br>${line.project}</p>`).join('')}<a href="${config.officialUrl}" target="_blank" rel="noopener noreferrer">Explorá los proyectos del centro</a></div></section>
    <div><section class="ticket"><span class="eyebrow">Tu pase al lado dulce</span><h2>${ticketHeading(ticket)}</h2><p>${ticketMessage(ticket)}</p><code class="ticket-code">${esc(ticket.code)}</code><button class="button small full" id="copy-code">Copiar mi código</button><small>Un canje inicial y un extra por código. Sujeto a disponibilidad. Guardá una captura para tenerlo a mano.</small></section>
    <section class="share-panel"><h3>${icon('gift')} ${ticket.bonusAt ? '¡Extra canjeado!' : 'Compartí la curiosidad.'}</h3><p>${ticket.bonusAt ? 'El stand ya registró tu premio por compartir.' : 'Invitá a alguien. Mostrá el mensaje o la publicación en el stand y llevate un premio extra.'}</p><a class="button mint small full" id="share" href="${shareUrl(matching)}" target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a><div class="share-actions"><button class="button secondary" type="button" id="copy-link">Copiar enlace</button><a class="button secondary" href="${xShareUrl(matching)}" target="_blank" rel="noopener noreferrer">Compartir en X</a><button class="button secondary" type="button" id="share-instagram">Instagram</button><button class="button secondary" type="button" id="share-native">Más opciones</button></div><p class="privacy-note">¡Elegí tu próximo compañero de investigación!</p></section></div></div>
    <section class="result-contact"><span class="eyebrow">Esto puede ser el comienzo</span><h2>¿Seguimos esta conversación?</h2><p>Mostranos tu resultado en el stand. Conocé al equipo y consultá cómo dar tus primeros pasos en investigación.</p><div class="result-actions">${config.contactUrl ? `<a class="button" href="${esc(config.contactUrl)}" target="_blank" rel="noopener noreferrer">Quiero sumarme al CInApTIC</a>` : `<a class="button" href="#lineas">Conocer las tres líneas</a>`}<a class="button mint home-button" href="#inicio">${icon('spark')}Volver al inicio</a></div></section>
    <p class="error" id="result-error" role="alert"></p></section>`;
  celebrateResult = false;
  document.querySelector('#copy-code').onclick = async () => {
    try { await navigator.clipboard.writeText(ticket.code); toast('Código copiado. ¡Nos vemos en el stand!'); }
    catch { toast('Mantené presionado el código para copiarlo o guardá una captura.'); }
  };
  document.querySelector('#share').onclick = () => toast('Después de enviar el mensaje, mostralo en el stand para el extra.');
  document.querySelector('#copy-link').onclick = async () => {
    if (await copyText(publicUrl())) toast('¡Enlace copiado! Pegalo donde quieras compartirlo.');
    else openShareDialog(matching, 'copy');
  };
  document.querySelector('#share-instagram').onclick = () => openShareDialog(matching, 'instagram');
  document.querySelector('#share-native').onclick = async () => {
    if (!navigator.share) { openShareDialog(matching); return; }
    try { await navigator.share({ title: 'Descubrí tu línea · CInApTIC', text: invitationText(matching), url: publicUrl() }); }
    catch (error) { if (error.name !== 'AbortError') openShareDialog(matching); }
  };
  if (!storageAvailable) toast('El navegador no permite guardar el progreso. Guardá una captura de tu código.');
}

// Keep redemption status current without asking the visitor to refresh it.
let syncingTicket = false;
async function syncTicket() {
  if (syncingTicket || !state.ticket || location.hash !== '#resultado' || document.hidden) return;
  syncingTicket = true;
  const revision = ticketRevision;
  try {
    const updated = state.ticket.syncPending
      ? await api('/api/participations/retake', { method: 'POST', body: JSON.stringify({ eventId: config.eventId, key: state.key, career: state.ticket.career, answers: state.ticket.answers }) })
      : await api('/api/participation', { headers: { Authorization: `Bearer ${state.key}` } });
    if (ticketRevision !== revision) return;
    state.ticket = updated;
    persist();
    if (location.hash !== '#resultado') return;
    // Update only status copy, preserving keyboard focus and open share dialogs.
    document.querySelector('.ticket h2').textContent = ticketHeading(updated);
    document.querySelector('.ticket > p').textContent = ticketMessage(updated);
    if (updated.bonusAt) {
      document.querySelector('.share-panel h3').innerHTML = `${icon('gift')} ¡Extra canjeado!`;
      document.querySelector('.share-panel > p').textContent = 'El stand ya registró tu premio por compartir.';
    }
  } catch (error) {
    if ((error.status === 404 || error.code === 'STORAGE_UNAVAILABLE') && revision === ticketRevision) {
      state.ticket.couponUnavailable = true;
      persist();
      if (location.hash === '#resultado') {
        document.querySelector('.ticket h2').textContent = ticketHeading(state.ticket);
        document.querySelector('.ticket > p').textContent = ticketMessage(state.ticket);
      }
    }
    // Offline visitors retain their saved ticket. Retry on return or reconnection.
  }
  finally { syncingTicket = false; }
}
window.addEventListener('focus', syncTicket);
window.addEventListener('online', syncTicket);
document.addEventListener('visibilitychange', syncTicket);
setInterval(syncTicket, 15000);

const publicUrl = () => config.publicUrl || `${location.origin}/`;
const invitationText = matching => `¡Mi curiosidad conecta con ${matching.map(line => line.name).join(' y ')}! ✨ Descubrí tu línea de investigación en el CInApTIC de la UTN FRRe. ¡Podríamos investigar juntos!`;
function shareUrl(matching) { return `https://wa.me/?text=${encodeURIComponent(`${invitationText(matching)} ${publicUrl()}`)}`; }
function xShareUrl(matching) { return `https://x.com/intent/tweet?${new URLSearchParams({ text: invitationText(matching), url: publicUrl() })}`; }
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
function openShareDialog(matching, mode = 'other') {
  const dialog = document.querySelector('#share-dialog');
  document.querySelector('#share-title').textContent = mode === 'instagram' ? 'Invitá por Instagram' : mode === 'copy' ? 'Copiá el enlace' : 'Compartí tu descubrimiento';
  document.querySelector('#share-help').textContent = mode === 'instagram' ? 'Copiá la invitación, abrí Instagram y pegala en un mensaje a tu próximo compañero de investigación.' : 'Copiá y pegá la invitación en la app o red que prefieras.';
  document.querySelector('#share-message').value = mode === 'copy' ? publicUrl() : `${invitationText(matching)} ${publicUrl()}`;
  document.querySelector('#open-instagram').hidden = mode !== 'instagram';
  document.querySelector('#copy-invitation').textContent = mode === 'copy' ? 'Copiar enlace' : 'Copiar invitación';
  dialog.querySelector('.share-feedback').textContent = '';
  dialog.showModal();
  document.querySelector('#share-message').focus();
  document.querySelector('#share-message').select();
}

let exitAction = null;
function confirmExit(action = () => { location.hash = 'inicio'; }) {
  exitAction = action;
  const dialog = document.querySelector('#exit-dialog');
  if (!dialog.open) dialog.showModal();
  document.querySelector('#keep-playing').focus();
}
document.querySelector('#keep-playing').onclick = () => document.querySelector('#exit-dialog').close();
document.querySelector('#confirm-exit').onclick = () => { persist(); document.querySelector('#exit-dialog').close(); exitAction?.(); };
document.querySelector('#reveal-dialog').addEventListener('cancel', event => event.preventDefault());
document.querySelector('#share-dialog .dialog-close').onclick = () => document.querySelector('#share-dialog').close();
document.querySelector('#copy-invitation').onclick = async () => {
  const field = document.querySelector('#share-message');
  const copied = await copyText(field.value);
  document.querySelector('.share-feedback').textContent = copied ? '¡Copiado! Ya podés pegarlo en tu mensaje.' : 'Seleccioná el texto y usá Copiar en el menú de tu dispositivo.';
  if (!copied) { field.focus(); field.select(); }
};
// Keep navigation through the logo or other internal links from discarding the quiz unexpectedly.
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || location.hash !== '#quiz' || (state.ticket && !state.retaking) || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const destination = new URL(link.href);
  if (destination.origin === location.origin && destination.hash !== '#quiz' && destination.hash !== '#main') {
    event.preventDefault(); confirmExit(() => location.assign(destination.href));
  }
});

function route() {
  discoveryObserver?.disconnect();
  document.body.dataset.view = location.hash === '#quiz' ? 'quiz' : location.hash === '#resultado' ? 'result' : 'home';
  if (location.hash !== '#quiz') document.querySelector('#reveal-dialog').close();
  if (location.hash === '#quiz') renderQuiz();
  else if (location.hash === '#resultado') { renderResult(); void syncTicket(); }
  else { renderHome(); if (location.hash === '#lineas') { const heading = document.querySelector('#lines-title'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); document.querySelector('#lineas').scrollIntoView(); return; } }
  focusHeading();
}
window.addEventListener('hashchange', route);
route();
