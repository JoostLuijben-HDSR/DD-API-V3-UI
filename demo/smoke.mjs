// Browser smoke test for the demo build: opens the UI, exercises the new features and
// saves screenshots. Uses only public reference data, so no API key is needed.
// Usage: BASE_URL=http://localhost:8080 OUT_DIR=smoke-output node demo/smoke.mjs
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.BASE_URL ?? 'http://localhost:8080';
const out = process.env.OUT_DIR ?? 'smoke-output';
mkdirSync(out, { recursive: true });

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`);
};
const pageErrors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, acceptDownloads: true });
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

async function shot(name) {
  await page.screenshot({ path: join(out, name), fullPage: true });
}

const panelOptions = () => page.locator('.mat-mdc-autocomplete-panel mat-option, .mat-mdc-select-panel mat-option');
const picker = label => page.locator('app-reference-picker', { hasText: label }).first();
const urlText = async () => page.locator('textarea').first().inputValue();

async function waitForOptionCount(min, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const count = await panelOptions().count();
    if (count >= min) {
      return count;
    }
    await page.waitForTimeout(250);
  }
  return panelOptions().count();
}

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('app-simple-search', { timeout: 60000 });
  await page.waitForTimeout(1500);

  // ---------------- Dutch (default) and the simple search ----------------
  check('Dutch is the default language', await page.getByRole('heading', { name: 'Eenvoudig zoeken' }).count() === 1);

  await picker('Waterbeheerder').locator('input').click();
  const organisations = await waitForOptionCount(10);
  check('water authorities are listed when the field is opened', organisations >= 10, `${organisations} options`);
  await picker('Waterbeheerder').locator('input').fill('stichtse');
  await page.getByRole('option', { name: /Stichtse Rijnlanden/ }).click();
  check('the water authority field is searchable', await picker('Waterbeheerder').locator('mat-chip-row', { hasText: 'Stichtse' }).count() === 1);

  await picker('Meetpakket').locator('input').click();
  const packages = await waitForOptionCount(10);
  check('measurement packages are shown on focus, without typing', packages >= 10, `${packages} options`);
  const groups = await page.locator('.mat-mdc-autocomplete-panel mat-optgroup').count();
  check('measurement packages are grouped', groups >= 3, `${groups} groups`);
  await picker('Meetpakket').locator('input').fill('bed planten');
  await page.getByRole('option', { name: /Planten bedekking \(PT\.BD\)/ }).waitFor({ timeout: 10000 });
  const bold = await page.locator('.mat-mdc-autocomplete-panel mat-option strong').count();
  check('words in any order find the option, with the matches in bold', bold >= 2, `${bold} highlighted parts`);
  await page.getByRole('option', { name: /Planten bedekking \(PT\.BD\)/ }).click();
  check('a chosen package is shown as a chip', await picker('Meetpakket').locator('mat-chip-row', { hasText: 'Planten bedekking' }).count() === 1);
  await page.waitForTimeout(500);
  const url = await urlText();
  check('simple search builds the filter', url.includes("Parameter/Organisation eq 'HSR'") && url.includes("Parameter/MeasurementPackage eq 'PT.BD'"), url);

  await picker('Meetlocatie').locator('input').click();
  await picker('Meetlocatie').locator('input').fill('brug langbroek');
  await page.getByRole('option', { name: /laatste brug/ }).first().waitFor({ timeout: 30000 }).catch(() => {});
  const bridge = await panelOptions().allInnerTexts();
  check('locations can be found with several words', bridge.some(t => /Langbroekerwetering laatste brug/i.test(t)), bridge.slice(0, 2).join(' | '));
  await picker('Meetlocatie').locator('input').fill('langbroek');
  const selectAll = page.getByRole('option', { name: /Alle \d+ treffers selecteren/ });
  await selectAll.waitFor({ timeout: 10000 });
  const selectAllText = await selectAll.innerText();
  await selectAll.click();
  await page.waitForTimeout(500);
  const chips = await picker('Meetlocatie').locator('mat-chip-row').count();
  check('all matching locations can be selected at once', chips >= 2, `${selectAllText.trim()} -> ${chips} chips`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const urlWithLocations = await urlText();
  check('the chosen locations are in the filter', urlWithLocations.includes('Foi/Code in ('), urlWithLocations.slice(0, 200));
  await picker('Meetlocatie').locator('mat-chip-row').first().locator('button').click();
  await page.waitForTimeout(500);

  await picker('Taxon of parameter').locator('input').click();
  await picker('Taxon of parameter').locator('input').fill('galium pal');
  await page.getByRole('option', { name: /Galium palustre/ }).first().waitFor({ timeout: 20000 }).catch(() => {});
  const taxa = await panelOptions().allInnerTexts();
  check('taxa are found by searching the server', taxa.some(t => /Galium palustre/.test(t)), taxa.slice(0, 3).join(' | '));
  await page.keyboard.press('Escape');

  await page.waitForTimeout(2500);
  const count = (await page.locator('.app-simple-count').innerText()).trim();
  check('the number of observations is shown (or why not)', /metingen gevonden|kon niet worden bepaald|tellen/.test(count), count);
  await shot('1-simple-search-nl.png');

  // ---------------- English and the advanced options ----------------
  await page.locator('mat-button-toggle', { hasText: 'EN' }).click();
  await page.waitForTimeout(500);
  check('the language can be switched to English', await page.getByRole('heading', { name: 'Simple search' }).count() === 1);
  await page.getByRole('button', { name: 'CLEAR ALL' }).click();

  await page.locator('mat-expansion-panel-header', { hasText: 'Advanced' }).click();
  await page.waitForTimeout(500);
  const filterRows = async () => page.locator('button[aria-label="Remove this filter"]').count();
  const before = await filterRows();
  await page.getByRole('button', { name: /ADD FILTER/ }).click();
  check('ADD FILTER adds a row', (await filterRows()) === before + 1, `${before} -> ${await filterRows()}`);
  const advancedDates = page.locator('mat-expansion-panel.app-advanced input[type="date"]');
  await advancedDates.nth(0).fill('2025-01-01');
  await advancedDates.nth(1).fill('2025-12-31');
  await page.getByRole('button', { name: 'ADD PERIOD' }).click();
  const advancedUrl = await urlText();
  check('period adds ge/lt filters with seconds',
    advancedUrl.includes('PhenomenonTime/BeginPosition ge 2025-01-01T00:00:00Z') && advancedUrl.includes('PhenomenonTime/BeginPosition lt 2026-01-01T00:00:00Z'), advancedUrl);
  await shot('2-advanced-en.png');

  await page.getByRole('button', { name: 'GET', exact: true }).click();
  await page.waitForSelector('.app-problem', { timeout: 60000 });
  const problem = (await page.locator('.app-problem').innerText()).replace(/\s+/g, ' ');
  check('error panel explains the error', problem.length > 20, problem);
  await shot('3-error.png');

  // References: table view
  await page.locator('mat-form-field', { hasText: 'Endpoint' }).first().locator('mat-select').click();
  await page.getByRole('option', { name: 'References', exact: true }).click();
  await page.waitForTimeout(3000);
  check('simple search is hidden for references', await page.locator('app-simple-search').count() === 0);
  await page.getByRole('button', { name: 'GET', exact: true }).click();
  await page.waitForSelector('table.app-result-table tbody tr', { timeout: 60000 });
  const rows = await page.locator('table.app-result-table tbody tr').count();
  const headers = await page.locator('table.app-result-table th').allInnerTexts();
  check('result is shown as a table', rows > 0, `${rows} rows, columns: ${headers.join(', ')}`);
  await shot('4-table.png');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: 'DOWNLOAD CSV' }).click()
  ]);
  const csvPath = join(out, download.suggestedFilename());
  await download.saveAs(csvPath);
  const csv = readFileSync(csvPath, 'utf8');
  const firstLine = csv.replace(/^\uFEFF/, '').split('\r\n')[0];
  check('CSV download has BOM and semicolon header', csv.startsWith('\uFEFF') && firstLine.includes(';') && firstLine.includes('Code'),
    `${download.suggestedFilename()}: ${firstLine.slice(0, 120)}`);

  await page.locator('mat-button-toggle', { hasText: 'JSON' }).click();
  await page.waitForTimeout(500);
  check('JSON view can be shown', await page.locator('ngx-json-viewer').count() > 0);
  await shot('5-json.png');
} catch (e) {
  check('smoke test ran to the end', false, String(e));
  await shot('error.png').catch(() => {});
} finally {
  await browser.close();
}

check('no JavaScript errors in the page', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));
writeFileSync(join(out, 'summary.json'), JSON.stringify({ checks, pageErrors }, null, 2));
process.exit(checks.every(c => c.ok) ? 0 : 1);
