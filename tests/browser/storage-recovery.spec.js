import { test, expect } from '@playwright/test';
import { config, questions } from '../../public/content.js';

test('repetir sigue disponible mientras falta configurar el registro persistente', async ({ page }) => {
  await page.goto('/');
  const answers = questions.map(q => q.options.findIndex(option => option.line === 'software'));
  const ticket = { code: 'CN-ZZZZZ-YYYYY', career: 'otra', answers: [0, 0, 0, 0, 0, 0], baseAt: null, bonusAt: null };
  await page.evaluate(({ eventId, answers, ticket }) => localStorage.setItem(`cinaptic:${eventId}:v1`, JSON.stringify({ key: 'c'.repeat(64), career: 'otra', step: 6, answers, ticket, retaking: true })), { eventId: config.eventId, answers, ticket });
  await page.route('**/api/participations/retake', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'STORAGE_UNAVAILABLE', error: 'El registro de premios está temporalmente fuera de servicio.' }) }));
  let issued = false;
  page.on('request', req => { if (new URL(req.url()).pathname === '/api/participations') issued = true; });
  await page.goto('/#quiz');
  await page.reload();
  await page.getByRole('button', { name: 'Descubrir mi resultado' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ingeniería de Software');
  await expect(page.locator('.ticket-code')).toHaveText(ticket.code);
  await expect(page.getByRole('heading', { name: 'Tu código necesita revisión' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ingeniería de Software');
  expect(issued).toBe(false);
});
