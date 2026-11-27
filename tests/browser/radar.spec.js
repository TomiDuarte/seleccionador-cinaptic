import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { config, lines, questions } from '../../public/content.js';

for (const scores of [[6, 0, 0], [2, 2, 2], [1, 3, 2]]) {
  test(`radar representa ${scores.join('/')} en ejes fijos y escala de seis`, async ({ page, request }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    const key = randomBytes(32).toString('hex');
    const choices = lines.flatMap((line, i) => Array(scores[i]).fill(line.id));
    const answers = questions.map((q, i) => q.options.findIndex(option => option.line === choices[i]));
    const response = await request.post('/api/participations', { data: { eventId: config.eventId, key, name: 'Ada Lovelace', career: 'otra', answers } });
    expect(response.status()).toBe(200);
    const ticket = await response.json();
    await page.goto('/');
    await page.evaluate(({ eventId, key, ticket }) => localStorage.setItem(`cinaptic:${eventId}:v1`, JSON.stringify({ key, name: 'Ada Lovelace', career: 'otra', step: 6, answers: ticket.answers, ticket })), { eventId: config.eventId, key, ticket });
    await page.reload();
    await page.goto('/#resultado');
    const panel = page.locator('.result-panel');
    await expect(panel.getByRole('img', { name: 'Tu curiosidad en las tres líneas de investigación' })).toBeVisible();
    await expect(panel.locator('progress')).toHaveCount(0);
    await expect(panel.locator('.radar-grid polygon')).toHaveCount(6);
    for (const [axis, line] of lines.entries()) {
      await expect(panel.locator(`.radar-label-${axis}`)).toContainText(line.name);
      await expect(panel.locator(`.radar-label-${axis} strong`)).toHaveText(`${scores[axis]} / 6`);
      await expect(panel.locator('#radar-description')).toContainText(`${line.name}: ${scores[axis]} de 6`);
      const dot = panel.locator(`.radar-point[data-line="${line.id}"]`);
      const x = Number(await dot.getAttribute('cx')) - 160;
      const y = Number(await dot.getAttribute('cy')) - 140;
      expect(Math.hypot(x, y)).toBeCloseTo(116 * scores[axis] / 6, 1);
    }
    const points = await panel.locator('.radar-area').getAttribute('points');
    expect(points.split(' ')).toHaveLength(3);
    await panel.screenshot({ path: testInfo.outputPath('radar-oscuro.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Activar modo claro' }).click();
    await panel.screenshot({ path: testInfo.outputPath('radar-claro.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 320, height: 760 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(panel.locator('.radar-area')).toHaveAttribute('points', points);
    for (const label of await panel.locator('.radar-label').all()) {
      expect(await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    }
    expect(await panel.locator('.radar-result').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    await panel.screenshot({ path: testInfo.outputPath('radar-320.png'), animations: 'disabled' });
  });
}
