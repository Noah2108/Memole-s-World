import { expect, test, type Page } from '@playwright/test';
import { screenshotPath } from './screenshots';

async function start(page: Page) {
  await page.clock.install({ time: new Date('2026-10-24T10:00:00Z') });
  await page.goto('/');
  await expect(page.getByTestId('expected')).toHaveText('770,00 €');
}
async function nav(page: Page, name: string) { await page.getByRole('navigation').getByRole('button', { name, exact: true }).click(); }
async function confirm(page: Page, word: 'ELIMINA' | 'AZZERA', button: string) {
  const modal = page.getByRole('dialog');
  await modal.getByLabel(`Scrivi ${word} per confermare`).fill(word);
  await modal.getByRole('button', { name: button, exact: true }).click();
  await expect(modal).not.toBeVisible();
}
async function stored(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem('memoles-world:v1')!)); }

test('eliminazione bambino: annulla, conferma e tutore condiviso conservato', async ({ page }) => {
  await start(page); await nav(page, 'Bambini');
  await page.getByRole('button', { name: 'Nuovo bambino', exact: true }).click();
  let modal = page.getByRole('dialog');
  await modal.getByLabel('Nome', { exact: true }).fill('Luca');
  await modal.getByLabel('Cognome', { exact: true }).fill('Rossi');
  await modal.getByLabel('Modalità tutori').selectOption('existing');
  await modal.getByRole('checkbox', { name: /Giulia Rossi/ }).check();
  await modal.getByRole('button', { name: 'Salva', exact: true }).click();
  await page.getByRole('button', { name: /Sofia Rossi.*4ª primaria/ }).click();
  await page.getByRole('button', { name: 'Elimina bambino', exact: true }).click();
  modal = page.getByRole('dialog');
  await expect(modal).toContainText('Sofia Rossi');
  await expect(modal.getByRole('button', { name: 'Elimina bambino' })).toBeDisabled();
  await modal.getByLabel('Scrivi ELIMINA per confermare').fill('elimina');
  await expect(modal.getByRole('button', { name: 'Elimina bambino' })).toBeDisabled();
  await expect(modal.getByRole('checkbox')).toHaveCount(0);
  await modal.getByRole('button', { name: 'Annulla', exact: true }).click();
  expect((await stored(page)).children).toHaveLength(5);
  await page.getByRole('button', { name: 'Elimina bambino', exact: true }).click();
  await confirm(page, 'ELIMINA', 'Elimina bambino');
  await expect(page.getByRole('heading', { name: 'I nostri bambini' })).toBeVisible();
  const data = await stored(page);
  expect(data.children).toHaveLength(4); expect(data.guardians).toHaveLength(4);
  expect(data.children.some((c: { firstName: string }) => c.firstName === 'Sofia')).toBe(false);
  expect(data.payments).toHaveLength(1);
  await page.getByRole('button', { name: /Luca Rossi/ }).click();
  await expect(page.getByText('Giulia Rossi', { exact: true })).toBeVisible();
  await page.reload(); expect((await stored(page)).children).toHaveLength(4);
});

test('archivia, riattiva ed elimina tutore con trasferimento dei bambini', async ({ page }) => {
  await start(page); await nav(page, 'Genitori e tutori');
  await page.getByRole('button', { name: 'Archivia tutore Giulia Rossi', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Archivia tutore', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Giulia Rossi', exact: true })).not.toBeVisible();
  await page.getByRole('checkbox', { name: 'Mostra archiviati' }).check();
  await expect(page.getByRole('heading', { name: 'Giulia Rossi', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Riattiva tutore Giulia Rossi', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Riattiva tutore', exact: true }).click();
  await page.getByRole('button', { name: 'Elimina tutore Giulia Rossi', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toContainText('Sofia Rossi');
  await modal.getByLabel('Tutore sostitutivo').selectOption({ label: 'Marco Bianchi' });
  await confirm(page, 'ELIMINA', 'Elimina tutore');
  expect((await stored(page)).guardians).toHaveLength(3);
  await nav(page, 'Bambini'); await page.getByRole('button', { name: /Sofia Rossi.*4ª primaria/ }).click();
  await expect(page.getByText('Marco Bianchi', { exact: true })).toBeVisible();
  await expect(page.getByTestId('expected')).toHaveText('220,00 €');
  await page.reload(); expect((await stored(page)).guardians).toHaveLength(3);
});

test('elimina anche un tutore rimasto inutilizzato insieme al bambino', async ({ page }) => {
  await start(page); await nav(page, 'Bambini');
  await page.getByRole('button', { name: /Sofia Rossi.*4ª primaria/ }).click();
  await page.getByRole('button', { name: 'Elimina bambino', exact: true }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: /Elimina anche/ }).check();
  await confirm(page, 'ELIMINA', 'Elimina bambino');
  const data = await stored(page); expect(data.children).toHaveLength(3); expect(data.guardians).toHaveLength(3);
  await nav(page, 'Il tuo archivio');
  await expect(page.getByRole('button', { name: 'Ripristina copia Elimina il bambino', exact: true })).toBeVisible();
});

test('corregge ed elimina rette e pagamenti ricalcolando i saldi', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page); await nav(page, 'Rette e pagamenti');
  await page.getByRole('button', { name: /Modifica retta Sofia Rossi/ }).click();
  let modal = page.getByRole('dialog');
  await modal.getByLabel('Importo della retta (€)').fill('219,99');
  await modal.getByRole('button', { name: 'Salva modifiche' }).click();
  await expect(modal.getByRole('alert')).toContainText('inferiore');
  await modal.getByLabel('Importo della retta (€)').fill('250,00');
  await modal.getByLabel('Descrizione della retta').fill('Retta Sofia corretta');
  await modal.getByLabel('Scadenza', { exact: true }).fill('2026-10-28');
  await modal.getByRole('button', { name: 'Salva modifiche' }).click();
  await expect(page.getByTestId('expected')).toHaveText('800,00 €');
  await nav(page, 'Storico');
  await page.getByRole('button', { name: /Modifica pagamento Sofia Rossi/ }).click();
  modal = page.getByRole('dialog'); await modal.getByLabel('Importo ricevuto (€)').fill('180,50');
  await modal.getByLabel('Metodo').selectOption('card');
  await modal.getByRole('button', { name: 'Salva modifiche' }).click();
  await nav(page, 'Panoramica'); await expect(page.getByTestId('received')).toHaveText('210,50 €');
  await expect(page.getByTestId('remaining')).toHaveText('589,50 €');
  await page.reload(); await expect(page.getByTestId('remaining')).toHaveText('589,50 €');
  await nav(page, 'Storico'); await page.getByRole('button', { name: /Elimina pagamento Sofia Rossi/ }).click();
  await confirm(page, 'ELIMINA', 'Elimina pagamento');
  await nav(page, 'Rette e pagamenti'); await expect(page.getByTestId('remaining')).toHaveText('770,00 €');
  await page.getByRole('button', { name: /Elimina retta Sofia Rossi/ }).click();
  await confirm(page, 'ELIMINA', 'Elimina retta');
  await expect(page.getByTestId('expected')).toHaveText('550,00 €');
  await nav(page, 'Il tuo archivio');
  await page.getByRole('button', { name: 'Ripristina copia Elimina il pagamento', exact: true }).click();
  modal = page.getByRole('dialog'); await modal.getByRole('checkbox').check();
  await modal.getByRole('button', { name: 'Sostituisci archivio' }).click();
  await nav(page, 'Panoramica'); await expect(page.getByTestId('remaining')).toHaveText('589,50 €');
  expect(errors).toEqual([]);
});

test('modifica accordo futuro ed elimina l’accordo con le rette collegate', async ({ page }) => {
  await start(page); await nav(page, 'Bambini'); await page.getByRole('button', { name: /Sofia Rossi.*4ª primaria/ }).click();
  await page.getByRole('button', { name: 'Modifica accordo Percorso completo', exact: true }).click();
  let modal = page.getByRole('dialog');
  await expect(modal.getByLabel('Tipo di accordo')).toBeDisabled();
  await modal.getByLabel('Tariffa (€)').fill('250,00');
  await modal.getByRole('button', { name: 'Salva modifiche' }).click();
  await expect(page.getByTestId('expected')).toHaveText('220,00 €');
  await page.getByRole('button', { name: 'Mese successivo' }).click();
  await page.getByRole('button', { name: 'Prepara rette', exact: true }).click();
  modal = page.getByRole('dialog'); await expect(modal).toContainText('650,00 €');
  await modal.getByRole('button', { name: 'Annulla' }).click();
  await page.getByRole('button', { name: 'Elimina accordo Percorso completo', exact: true }).click();
  await confirm(page, 'ELIMINA', 'Elimina accordo');
  const data = await stored(page); expect(data.children).toHaveLength(4); expect(data.agreements).toHaveLength(3); expect(data.payments).toHaveLength(1);
});

test('azzera soltanto rette e pagamenti, riapre e recupera la copia automatica', async ({ page }) => {
  await start(page); await nav(page, 'Il tuo archivio');
  await page.getByRole('button', { name: 'Azzera solo rette e pagamenti', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Annulla' }).click();
  expect((await stored(page)).charges).toHaveLength(8);
  await page.getByRole('button', { name: 'Azzera solo rette e pagamenti', exact: true }).click();
  await confirm(page, 'AZZERA', 'Azzera rette e pagamenti');
  let data = await stored(page); expect(data.children).toHaveLength(4); expect(data.agreements).toHaveLength(4); expect(data.charges).toEqual([]); expect(data.payments).toEqual([]);
  await page.reload(); await expect(page.getByTestId('expected')).toHaveText('0,00 €');
  await nav(page, 'Il tuo archivio');
  await page.getByRole('button', { name: 'Ripristina copia Azzera rette e pagamenti', exact: true }).click();
  const modal = page.getByRole('dialog'); await modal.getByRole('checkbox').check(); await modal.getByRole('button', { name: 'Sostituisci archivio' }).click();
  await expect(modal).not.toBeVisible();
  data = await stored(page); expect(data.charges).toHaveLength(8); expect(data.payments).toHaveLength(2);
  await nav(page, 'Panoramica'); await expect(page.getByTestId('expected')).toHaveText('770,00 €');
});

test('riparte completamente vuoto, crea una nuova famiglia e ripristina gli esempi solo su richiesta', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page); await nav(page, 'Il tuo archivio');
  await page.getByRole('button', { name: 'Riparti da zero', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('button', { name: 'Svuota tutto' })).toBeDisabled();
  await page.screenshot({ path: screenshotPath('azzeramento-v011.png'), fullPage: true });
  await confirm(page, 'AZZERA', 'Svuota tutto');
  let data = await stored(page);
  for (const key of ['children', 'guardians', 'agreements', 'charges', 'payments', 'audit']) expect(data[key]).toEqual([]);
  await page.reload(); await expect(page.getByTestId('expected')).toHaveText('0,00 €');
  await nav(page, 'Bambini'); await expect(page.getByRole('heading', { name: '0 percorsi da accompagnare' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuovo bambino', exact: true }).click();
  let form = page.getByRole('dialog'); await form.getByLabel('Nome', { exact: true }).fill('Nuova'); await form.getByLabel('Cognome', { exact: true }).fill('Famiglia');
  await form.getByLabel('Nome e cognome del tutore').fill('Genitore nuovo'); await form.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(form).not.toBeVisible();
  data = await stored(page); expect(data.children).toHaveLength(1); expect(data.guardians).toHaveLength(1); expect(data.charges).toEqual([]);
  await nav(page, 'Il tuo archivio'); await page.screenshot({ path: screenshotPath('gestione-archivio-v011.png'), fullPage: true });
  await page.getByRole('button', { name: 'Ripristina copia Riparti da zero', exact: true }).click();
  form = page.getByRole('dialog'); await form.getByRole('checkbox').check(); await form.getByRole('button', { name: 'Sostituisci archivio' }).click();
  await nav(page, 'Panoramica'); await expect(page.getByTestId('expected')).toHaveText('770,00 €');
  expect(errors).toEqual([]);
});

test('se non riesce la copia di sicurezza, azzeramento ed eliminazioni non vengono eseguiti', async ({ page }) => {
  await start(page); await nav(page, 'Il tuo archivio');
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, val) { if (key === 'memoles-world:safety:v1') throw new Error('Spazio per copia di sicurezza esaurito'); return original.call(this, key, val); }; });
  await page.getByRole('button', { name: 'Riparti da zero', exact: true }).click();
  const modal = page.getByRole('dialog'); await modal.getByLabel('Scrivi AZZERA per confermare').fill('AZZERA');
  await modal.getByRole('button', { name: 'Svuota tutto' }).click();
  await expect(modal.getByRole('alert')).toContainText('Spazio per copia di sicurezza');
  expect((await stored(page)).charges).toHaveLength(8); expect((await stored(page)).children).toHaveLength(4);
  await page.reload(); await expect(page.getByTestId('expected')).toHaveText('770,00 €');
});
