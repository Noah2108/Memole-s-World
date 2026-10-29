import { expect, test } from '@playwright/test';
import { screenshotPath } from './screenshots';

test('Veste floreale: font locali, saluto, calendario e finestre alle dimensioni desktop', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-24T10:00:00Z') });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bentornata Hoara' })).toBeVisible();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const family of ['Cormorant Garamond', 'Lora', 'Allura']) {
    expect(await page.evaluate(family => [...document.fonts].some(face => face.family.replaceAll(/['"]/g, '') === family && face.status === 'loaded'), family), `${family} caricato dal pacchetto locale`).toBe(true);
  }
  const calendar = page.getByRole('region', { name: 'Calendario rette di ottobre 2026' });
  await expect(calendar.getByLabel('1 ott 2026, 1 retta in scadenza', { exact: true })).toBeVisible();
  await expect(calendar.getByLabel('24 ott 2026', { exact: true })).toHaveAttribute('aria-current', 'date');
  await page.getByLabel('Anno di riferimento').selectOption('2024');
  await page.getByLabel('Mese di riferimento', { exact: true }).selectOption('02');
  const leapFebruary = page.getByRole('region', { name: 'Calendario rette di febbraio 2024' });
  await expect(leapFebruary.getByLabel('29 feb 2024', { exact: true })).toBeVisible();
  await expect(leapFebruary.locator('.calendar-day')).toHaveCount(29);
  await page.getByLabel('Anno di riferimento').selectOption('2026');
  await page.getByLabel('Mese di riferimento', { exact: true }).selectOption('10');
  await calendar.getByRole('button', { name: 'Apri le rette del mese' }).click();
  await expect(page.getByRole('heading', { name: 'Rette e scadenze', exact: true })).toBeVisible();
  for (const size of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1060, height: 720 }]) {
    await page.setViewportSize(size);
    for (const [label, slug] of [['Panoramica', 'panoramica'], ['Bambini', 'bambini'], ['Genitori e tutori', 'tutori'], ['Rette e pagamenti', 'rette'], ['Storico', 'storico'], ['Il tuo archivio', 'archivio']]) {
      await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: nessuna eccedenza orizzontale a ${size.width}`).toBe(true);
      await expect(page.getByRole('navigation')).toBeInViewport({ ratio: 1 });
      if (size.width === 1280 || (slug === 'panoramica')) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: screenshotPath(`floreale-${slug}-${size.width}.png`), fullPage: true });
      }
    }
  }
  await page.getByRole('navigation').getByRole('button', { name: 'Panoramica', exact: true }).click();
  await page.getByRole('button', { name: 'Apri le schede', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'I nostri bambini' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuovo bambino', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByRole('button', { name: 'Salva', exact: true })).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: screenshotPath('floreale-finestra-1280.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
