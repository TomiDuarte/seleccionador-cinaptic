import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { config, questions, lines } from '../../public/content.js';
import { calculateResult } from '../../public/quiz.js';

test('recorrido móvil, recuperación, resultado, WhatsApp y canje real', async ({ page, browser }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedText = text; } } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.sharedData = data; } });
  });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Seleccionador Cinaptic');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('main')).not.toContainText('Unos 2 minutos');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu curiosidad');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('inicio.png'), fullPage: true });
  await page.getByRole('link', { name: 'Descubrir mi línea', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ir al inicio', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Salir del cuestionario' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeDisabled();
  await page.getByLabel('Tu carrera o etapa').selectOption('secundaria');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('radio').nth(0).check();
  await page.reload();
  await expect(page.getByRole('radio').nth(0)).toBeChecked();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(page.getByRole('radio').nth(0)).toBeChecked();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  for (const index of [2, 1, 0, 1]) {
    await page.getByRole('radio').nth(index).check();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  }
  await page.getByRole('radio').nth(2).check();
  const revealStarted = Date.now();
  await page.getByRole('button', { name: 'Descubrir mi resultado' }).click();
  await expect(page.locator('#reveal-dialog')).toBeVisible();
  await expect(page.locator('#reveal-dialog')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('#reveal-dialog')).toHaveCSS('border-top-width', '0px');
  await page.screenshot({ path: testInfo.outputPath('revelacion.png'), animations: 'disabled' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Comunicaciones');
  expect(Date.now() - revealStarted).toBeGreaterThanOrEqual(3400);
  await expect(page.locator('.ticket > p')).toHaveText('Mostrá este código en el stand del CInApTIC y canjealo por un dulce premio');
  const code = await page.locator('.ticket-code').innerText();
  const whatsapp = await page.getByRole('link', { name: 'Compartir por WhatsApp' }).getAttribute('href');
  expect(whatsapp).toContain('https://wa.me/?text=');
  expect(decodeURIComponent(whatsapp)).toContain('Comunicaciones');
  expect(whatsapp).not.toContain(code);
  const xUrl = new URL(await page.getByRole('link', { name: 'Compartir en X' }).getAttribute('href'));
  expect(xUrl.hostname).toBe('x.com');
  expect(xUrl.searchParams.get('text')).toContain('Comunicaciones');
  expect(xUrl.href).not.toContain(code);
  await page.getByRole('button', { name: 'Copiar enlace', exact: true }).click();
  expect(await page.evaluate(() => window.copiedText)).toBe('http://127.0.0.1:3107/');
  await page.getByRole('button', { name: 'Instagram', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Tu invitación')).toHaveValue(/Comunicaciones/);
  await page.getByRole('button', { name: 'Copiar invitación' }).click();
  expect(await page.evaluate(() => window.copiedText)).toContain('Comunicaciones');
  expect(await page.evaluate(() => window.copiedText)).not.toContain(code);
  await expect(page.getByRole('link', { name: 'Abrir Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/');
  await page.getByRole('button', { name: 'Cerrar opciones para compartir' }).click();
  await page.getByRole('button', { name: 'Más opciones' }).click();
  expect(await page.evaluate(() => window.sharedData.url)).toBe('http://127.0.0.1:3107/');
  expect(await page.evaluate(() => window.sharedData.text)).not.toContain(code);
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'Copiar enlace', exact: true }).click();
  await expect(page.getByLabel('Tu invitación')).toHaveValue('http://127.0.0.1:3107/');
  await page.getByRole('button', { name: 'Cerrar opciones para compartir' }).click();
  await page.reload();
  await expect(page.locator('.ticket-code')).toHaveText(code);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('resultado.png'), fullPage: true });
  const operator = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const admin = await operator.newPage();
  await admin.goto('http://127.0.0.1:3107/admin');
  await admin.getByLabel('Contraseña del equipo').fill('only-for-automated-tests');
  await admin.getByRole('button', { name: 'Ingresar al panel' }).click();
  await admin.getByLabel('Código del participante').fill(code);
  await admin.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(admin.getByRole('button', { name: 'Confirmar canje extra' })).toBeDisabled();
  await admin.getByRole('button', { name: 'Confirmar canje inicial' }).click();
  await expect(admin.locator('#admin-status')).toContainText('Canje inicial registrado');
  await expect(admin.getByRole('button', { name: 'Confirmar canje inicial' })).toHaveCount(0);
  await admin.getByLabel('Vi el mensaje o la publicación').check();
  await admin.getByRole('button', { name: 'Confirmar canje extra' }).click();
  await expect(admin.locator('#admin-status')).toContainText('Canje extra registrado');
  await expect(admin.locator('.done')).toHaveCount(2);
  await admin.screenshot({ path: testInfo.outputPath('panel.png'), fullPage: true });
  await expect(page.getByRole('button', { name: 'Actualizar estado de mi premio' })).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: '¡Premio inicial canjeado!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¡Extra canjeado!' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al inicio', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu curiosidad');
  await admin.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(admin.getByLabel('Contraseña del equipo')).toBeVisible();
  await operator.close();
  expect(pageErrors).toEqual([]);
});

test('fallo de red al terminar permite reintentar sin perder las respuestas', async ({ page }) => {
  await page.goto('/#quiz');
  await page.getByLabel('Tu carrera o etapa').selectOption('explorando');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  for (let i = 0; i < 6; i++) {
    await page.getByRole('radio').nth(0).check();
    if (i < 5) await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  }
  await page.route('**/api/participations', route => route.abort());
  await page.getByRole('button', { name: 'Descubrir mi resultado' }).click();
  await expect(page.getByRole('alert')).toContainText('No pudimos conectar');
  await expect(page.getByRole('radio').nth(0)).toBeChecked();
  await page.unroute('**/api/participations');
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('.ticket-code')).toContainText('CN-');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¡Curiosidad sin fronteras!');
});

test('320 px, navegación por teclado y almacenamiento dañado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cinaptic:noche-universidades-2026-v2:v1', '{invalid-json'));
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/#quiz');
  await page.getByLabel('Tu carrera o etapa').selectOption('otra');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('radio').first().focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio').first()).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('temas persistentes, logos y confirmación de salida conservan el progreso', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(9, 25, 37)');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#091925');
  await expect(page.locator('.brand .logo-dark')).toBeVisible();
  expect(await page.locator('.brand .logo-dark').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole('link', { name: 'El centro', exact: true })).toHaveAttribute('href', /frre.utn.edu.ar.*CInApTIC/);
  await expect(page.locator('.university-link')).toHaveAttribute('href', 'https://www.frre.utn.edu.ar/');
  const caption = await page.locator('.art-caption').boundingBox();
  const illustration = await page.locator('.hero-art img').boundingBox();
  expect(caption.y).toBeGreaterThanOrEqual(illustration.y + illustration.height - 12);
  await page.screenshot({ path: testInfo.outputPath('inicio-oscuro.png'), fullPage: true });
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await expect(page.locator('.brand .logo-light')).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f4f8fb');
  await page.screenshot({ path: testInfo.outputPath('inicio-claro.png'), fullPage: true });
  await page.getByRole('link', { name: 'Descubrir mi línea', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await page.getByLabel('Tu carrera o etapa').selectOption('otra');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.locator('.hat-coach')).toHaveClass(/cheering/);
  await page.getByRole('radio').nth(1).check();
  await page.screenshot({ path: testInfo.outputPath('pregunta-claro.png'), fullPage: true });
  await page.getByRole('button', { name: 'Salir del cuestionario' }).click();
  await expect(page.getByRole('dialog')).toContainText('¿Seguro que quieres salir del cuestionario?');
  await expect(page.getByRole('button', { name: '¡Quedarme!' })).toBeFocused();
  await page.getByRole('button', { name: '¡Quedarme!' }).click();
  await expect(page.getByRole('radio').nth(1)).toBeChecked();
  await page.getByRole('button', { name: 'Salir del cuestionario' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('radio').nth(1)).toBeChecked();
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await page.screenshot({ path: testInfo.outputPath('pregunta-oscuro.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Salir del cuestionario' }).click();
  await page.screenshot({ path: testInfo.outputPath('confirmar-salida.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu curiosidad');
  await page.getByRole('link', { name: 'Continuar mi descubrimiento', exact: true }).click();
  await expect(page.getByRole('radio').nth(1)).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('movimiento reducido mantiene el tiempo de lectura sin animación', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#quiz');
  await page.getByLabel('Tu carrera o etapa').selectOption('otra');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  expect(await page.locator('.hat-coach img').evaluate(img => getComputedStyle(img).animationName)).toBe('none');
  for (let i = 0; i < 6; i++) {
    await page.getByRole('radio').nth(0).check();
    if (i < 5) await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  }
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6');
  const revealStarted = Date.now();
  await page.getByRole('button', { name: 'Descubrir mi resultado' }).click();
  await expect(page.locator('.ticket-code')).toBeVisible();
  expect(Date.now() - revealStarted).toBeGreaterThanOrEqual(3400);
  await expect(page.locator('.celebration')).toBeHidden();
  expect(await page.locator('.result-header').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

for (const [id, name, projectText] of [
  ['software', 'Ingeniería de Software', 'gobierno y calidad de datos'],
  ['inteligentes', 'Sistemas Inteligentes', 'semillas de algodón'],
]) {
  test(`el resultado de ${name} muestra los proyectos actuales`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto('/#quiz');
    await page.getByLabel('Tu carrera o etapa').selectOption('otra');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    for (let i = 0; i < questions.length; i++) {
      await page.getByRole('radio').nth(questions[i].options.findIndex(option => option.line === id)).check();
      await page.getByRole('button', { name: i === questions.length - 1 ? 'Descubrir mi resultado' : 'Continuar', exact: true }).click();
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.locator('.result-project')).toContainText(projectText);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`resultado-${id}.png`), fullPage: true, animations: 'disabled' });
  });
}

test('el progreso viejo de prueba no se interpreta con las preguntas nuevas', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('cinaptic:noche-universidades-2026:v1', JSON.stringify({
      key: 'a'.repeat(64), career: 'sistemas', step: 6, answers: [0,0,0,0,0,0],
      ticket: { code: 'CN-AAAAA-BBBBB', answers: [0,0,0,0,0,0] },
    }));
  });
  await page.reload();
  await expect(page.getByRole('link', { name: 'Descubrir mi línea', exact: true })).toBeVisible();
  for (const name of ['Comunicaciones', 'Ingeniería de Software', 'Sistemas Inteligentes']) {
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
  }
  await page.getByRole('link', { name: 'Descubrir mi línea', exact: true }).click();
  await expect(page.getByLabel('Tu carrera o etapa')).toHaveValue('');
  const stored = await page.evaluate(eventId => JSON.parse(localStorage.getItem(`cinaptic:${eventId}:v1`)), config.eventId);
  expect(stored.ticket).toBeNull();
  expect(stored.key).not.toBe('a'.repeat(64));
});

test('las líneas se descubren después del quiz y permanecen disponibles al volver', async ({ page }, testInfo) => {
  await page.goto('/#lineas');
  await expect(page.locator('.discovery-locked')).toBeVisible();
  await expect(page.locator('.line-card')).toHaveCount(0);
  for (const line of lines) {
    await expect(page.locator('main')).not.toContainText(line.name);
    await expect(page.locator('main')).not.toContainText(line.description);
  }
  await page.getByRole('link', { name: 'Empezar el cuestionario', exact: true }).click();
  await page.getByLabel('Tu carrera o etapa').selectOption('otra');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Salir del cuestionario' }).click();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page.locator('.line-card')).toHaveCount(0);
  await page.getByRole('link', { name: 'Continuar el cuestionario', exact: true }).click();
  for (let i = 0; i < questions.length; i++) {
    await page.getByRole('radio').nth(questions[i].options.findIndex(option => option.line === 'software')).check();
    await page.getByRole('button', { name: i === questions.length - 1 ? 'Descubrir mi resultado' : 'Continuar', exact: true }).click();
  }
  await expect(page.locator('.ticket-code')).toBeVisible();
  await page.getByRole('link', { name: 'Conocer las tres líneas', exact: true }).click();
  await expect(page.locator('#lines-title')).toBeFocused();
  await expect(page.locator('.discovery-locked')).toHaveCount(0);
  await expect(page.locator('.discovery-card')).toHaveCount(3);
  await expect(page.locator('.software .connection-label')).toHaveText('Tu conexión con el sombrero');
  await expect(page.locator('.connection-label')).toHaveCount(1);
  for (const line of lines) {
    const card = page.locator(`.discovery-card.${line.id}`);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/discovered/);
    await expect(card).toContainText(line.description);
    await card.getByText('Una idea para investigar', { exact: true }).click();
    await expect(card.locator('details')).toContainText(line.project);
    await expect(card.locator('details')).toHaveAttribute('open', '');
  }
  await expect(page.getByRole('link', { name: 'Ver proyectos en la web oficial' })).toHaveAttribute('href', config.officialUrl);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#lineas').screenshot({ path: testInfo.outputPath('lineas-claro.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await page.locator('#lineas').screenshot({ path: testInfo.outputPath('lineas-oscuro.png'), animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('.discovery-card')).toHaveCount(3);
  expect(await page.locator('.universe-ring').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.setViewportSize({ width: 320, height: 760 });
  for (const summary of await page.locator('.discovery-card summary').all()) await summary.click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#lineas').screenshot({ path: testInfo.outputPath('lineas-320.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Volver a responder el quiz' }).click();
  await page.getByRole('button', { name: 'Salir del cuestionario' }).click();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page.locator('.discovery-card')).toHaveCount(3);
});

test('repetir desde el inicio conserva código y canjes, incluso al salir y recargar', async ({ page, request }, testInfo) => {
  const key = randomBytes(32).toString('hex');
  const originalAnswers = questions.map(q => q.options.findIndex(option => option.line === 'comunicaciones'));
  const created = await request.post('/api/participations', { data: { eventId: config.eventId, key, career: 'sistemas', answers: originalAnswers } });
  expect(created.status()).toBe(200);
  const ticket = await created.json();
  await request.post('/api/admin/login', { data: { password: 'only-for-automated-tests' } });
  await request.post('/api/admin/redeem', { data: { code: ticket.code, kind: 'base' } });
  const redeemed = await (await request.post('/api/admin/redeem', { data: { code: ticket.code, kind: 'bonus', confirmed: true } })).json();
  const before = await (await request.get('/api/admin/stats')).json();
  await page.goto('/');
  await page.evaluate(({ eventId, key, ticket }) => localStorage.setItem(`cinaptic:${eventId}:v1`, JSON.stringify({
    key, career: ticket.career, answers: ticket.answers, step: 6, ticket, retaking: false,
  })), { eventId: config.eventId, key, ticket });
  await page.reload();
  await expect(page).toHaveTitle('Seleccionador Cinaptic');
  await page.screenshot({ path: testInfo.outputPath('inicio-repetir.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Volver a responder el quiz' }).click();
  await page.getByLabel('Tu carrera o etapa').selectOption('otra');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
  const chosen = questions[0].options.findIndex(option => option.line === 'software');
  await page.getByRole('radio').nth(chosen).check();
  await page.getByRole('link', { name: 'CInApTIC, inicio', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar el quiz' }).click();
  await page.reload();
  await expect(page.getByRole('radio').nth(chosen)).toBeChecked();
  for (let i = 0; i < questions.length; i++) {
    if (i > 0) await page.getByRole('radio').nth(questions[i].options.findIndex(option => option.line === 'software')).check();
    if (i < questions.length - 1) await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  }
  await page.route('**/api/participations/retake', route => route.abort());
  await page.getByRole('button', { name: 'Descubrir mi resultado' }).click();
  await expect(page.getByRole('alert')).toContainText('No pudimos conectar');
  await page.unroute('**/api/participations/retake');
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ingeniería de Software');
  await expect(page.locator('.ticket-code')).toHaveText(ticket.code);
  await expect(page.getByRole('heading', { name: '¡Premio inicial canjeado!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¡Extra canjeado!' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ingeniería de Software');
  await expect(page.locator('.ticket-code')).toHaveText(ticket.code);
  const own = await (await request.get('/api/participation', { headers: { Authorization: `Bearer ${key}` } })).json();
  expect(own.code).toBe(ticket.code);
  expect(own.baseAt).toBe(redeemed.baseAt);
  expect(own.bonusAt).toBe(redeemed.bonusAt);
  expect(await (await request.get('/api/admin/stats')).json()).toEqual(before);
  const state = await page.evaluate(eventId => JSON.parse(localStorage.getItem(`cinaptic:${eventId}:v1`)), config.eventId);
  expect(state.key).toBe(key);
  expect(state.retaking).toBe(false);
});

for (const recoverable of [false, true]) {
  test(`registro ausente al repetir: resultado local sin otro premio${recoverable ? ' y sincronización posterior' : ''}`, async ({ page, request }, testInfo) => {
    const key = randomBytes(32).toString('hex');
    const initialAnswers = questions.map(q => q.options.findIndex(option => option.line === 'comunicaciones'));
    let ticket = { code: 'CN-ZZZZZ-YYYYY', career: 'otra', answers: initialAnswers, createdAt: '2026-11-20T12:00:00.000Z', baseAt: '2026-11-20T12:01:00.000Z', bonusAt: '2026-11-20T12:02:00.000Z', result: calculateResult(initialAnswers) };
    await request.post('/api/admin/login', { data: { password: 'only-for-automated-tests' } });
    if (recoverable) {
      ticket = await (await request.post('/api/participations', { data: { eventId: config.eventId, key, career: 'otra', answers: initialAnswers } })).json();
      await request.post('/api/admin/redeem', { data: { code: ticket.code, kind: 'base' } });
      ticket = await (await request.post('/api/admin/redeem', { data: { code: ticket.code, kind: 'bonus', confirmed: true } })).json();
      await page.route('**/api/participations/retake', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'No encontramos tu participación.' }) }));
    }
    const before = await (await request.get('/api/admin/stats')).json();
    let newCoupons = 0;
    page.on('request', req => { if (new URL(req.url()).pathname === '/api/participations' && req.method() === 'POST') newCoupons++; });
    await page.goto('/');
    await page.evaluate(({ eventId, key, ticket }) => localStorage.setItem(`cinaptic:${eventId}:v1`, JSON.stringify({ key, career: ticket.career, answers: ticket.answers, step: 6, ticket })), { eventId: config.eventId, key, ticket });
    await page.reload();
    await page.getByRole('button', { name: 'Volver a responder el quiz' }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(page.getByRole('radio').nth(2)).toHaveAccessibleName('En una computadora que aprende a reconocer patrones mediante figuras.');
    for (let i = 0; i < questions.length; i++) {
      await page.getByRole('radio').nth(questions[i].options.findIndex(option => option.line === 'inteligentes')).check();
      await page.getByRole('button', { name: i === questions.length - 1 ? 'Descubrir mi resultado' : 'Continuar', exact: true }).click();
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sistemas Inteligentes');
    await expect(page.locator('.ticket-code')).toHaveText(ticket.code);
    await expect(page.getByRole('heading', { name: 'Tu código necesita revisión' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sistemas Inteligentes');
    await expect(page.locator('.ticket-code')).toHaveText(ticket.code);
    const saved = await page.evaluate(eventId => JSON.parse(localStorage.getItem(`cinaptic:${eventId}:v1`)), config.eventId);
    expect(saved.key).toBe(key);
    expect(saved.ticket.baseAt).toBe(ticket.baseAt);
    expect(saved.ticket.bonusAt).toBe(ticket.bonusAt);
    expect(saved.ticket.syncPending).toBe(true);
    expect(saved.retaking).toBe(false);
    await page.screenshot({ path: testInfo.outputPath('resultado-recuperado.png'), fullPage: true, animations: 'disabled' });
    if (recoverable) {
      await page.unroute('**/api/participations/retake');
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(page.getByRole('heading', { name: '¡Premio inicial canjeado!' })).toBeVisible();
      const own = await (await request.get('/api/participation', { headers: { Authorization: `Bearer ${key}` } })).json();
      expect(own.result.topIds).toEqual(['inteligentes']);
      expect(own.code).toBe(ticket.code);
      expect(own.baseAt).toBe(ticket.baseAt);
      expect(own.bonusAt).toBe(ticket.bonusAt);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sistemas Inteligentes');
    }
    expect(newCoupons).toBe(0);
    expect(await (await request.get('/api/admin/stats')).json()).toEqual(before);
  });
}
