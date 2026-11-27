import { test, expect } from '@playwright/test';
import { config } from '../../public/content.js';
import { eventEndTime, eventStatus } from '../../public/event.js';

test('nombre obligatorio, progreso recuperable y datos en el panel', async ({ page }, testInfo) => {
  await page.goto('/#quiz');
  await page.getByLabel('Tu carrera o etapa').selectOption('sistemas');
  await page.getByLabel('Tu nombre', { exact: true }).fill('   ');
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeDisabled();
  await page.getByLabel('Tu nombre', { exact: true }).fill('Ana María');
  await page.reload();
  await expect(page.getByLabel('Tu nombre', { exact: true })).toHaveValue('Ana María');
  await expect(page.getByLabel('Tu carrera o etapa')).toHaveValue('sistemas');
  await page.screenshot({ path: testInfo.outputPath('datos-iniciales.png'), fullPage: true });
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  for (let i = 0; i < 6; i++) {
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: i === 5 ? 'Descubrir mi resultado' : 'Continuar', exact: true }).click();
  }
  const code = await page.locator('.ticket-code').textContent();
  await page.goto('/admin');
  await page.getByLabel('Contraseña del equipo').fill('only-for-automated-tests');
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await page.getByLabel('Código del participante').fill(code);
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(page.locator('.participant-details')).toContainText('Ana María');
  await expect(page.locator('.participant-details')).toContainText('Ingeniería en Sistemas de Información');
});

test('vista previa de cierre muestra Instagram sin emitir códigos', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const errors = [];
  let issues = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/participations')) issues++; });
  await page.goto('/?vista=cierre#quiz');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('La noche terminó.');
  await expect(page.getByRole('link', { name: 'Escribinos por Instagram' })).toHaveAttribute('href', config.contactUrl);
  await expect(page.locator('#quiz-form, .ticket-code')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('cierre-oscuro.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await page.screenshot({ path: testInfo.outputPath('cierre-claro.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 320, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(issues).toBe(0);
  expect(errors).toEqual([]);
});

test('una pestaña abierta cambia al cierre usando la hora del servidor', async ({ page }) => {
  // The browser's wall clock may disagree; server time is authoritative.
  await page.clock.setFixedTime(new Date('2026-11-20T12:00:00Z'));
  await page.route('**/api/event', route => route.fulfill({ json: eventStatus(eventEndTime - 4000) }));
  await page.goto('/#quiz');
  await expect(page.locator('#quiz-form')).toBeVisible();
  await page.getByRole('button', { name: 'Salir del cuestionario' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('La noche terminó.', { timeout: 8000 });
  await expect(page.locator('dialog[open], #quiz-form, .ticket-code')).toHaveCount(0);
  await expect(page.locator('.closure-preview')).toHaveCount(0);
});
