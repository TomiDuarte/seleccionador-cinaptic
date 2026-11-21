import { test, expect } from '@playwright/test';

test('recorrido móvil, recuperación, resultado, WhatsApp y canje real', async ({ page, browser }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu curiosidad');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('inicio.png'), fullPage: true });
  await page.getByRole('link', { name: 'Descubrir mi línea', exact: true }).click();
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
  await page.getByRole('button', { name: 'Descubrir mi resultado' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Redes');
  const code = await page.locator('.ticket-code').innerText();
  const whatsapp = await page.getByRole('link', { name: 'Compartir por WhatsApp' }).getAttribute('href');
  expect(whatsapp).toContain('https://wa.me/?text=');
  expect(decodeURIComponent(whatsapp)).toContain('Redes');
  expect(whatsapp).not.toContain(code);
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
  await admin.getByLabel('Vi el mensaje de WhatsApp').check();
  await admin.getByRole('button', { name: 'Confirmar canje extra' }).click();
  await expect(admin.locator('#admin-status')).toContainText('Canje extra registrado');
  await expect(admin.locator('.done')).toHaveCount(2);
  await admin.screenshot({ path: testInfo.outputPath('panel.png'), fullPage: true });
  await page.getByRole('button', { name: 'Actualizar estado de mi premio' }).click();
  await expect(page.getByRole('heading', { name: '¡Premio inicial canjeado!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¡Extra canjeado!' })).toBeVisible();
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
  await page.evaluate(() => localStorage.setItem('cinaptic:noche-universidades-2026:v1', '{invalid-json'));
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
