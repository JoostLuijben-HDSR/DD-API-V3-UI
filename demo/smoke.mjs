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
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

async function shot(name) {
  await page.screenshot({ path: join(out, name), fullPage: true });
}

async function chooseInSelect(label, option) {
  await page.locator('mat-form-field', { hasText: label }).first().locator('mat-select').click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('mat-expansion-panel', { timeout: 60000 });
  await page.waitForTimeout(2000);
  await shot('1-start.png');
  check('page loads', await page.locator('mat-expansion-panel').count() > 0);

  // Filters: ADD FILTER and the period helper (observations end point)
  const filterRows = async () => page.locator('button[aria-label="Remove this filter"]').count();
  const before = await filterRows();
  await page.getByRole('button', { name: /ADD FILTER/ }).click();
  check('ADD FILTER adds a row', (await filterRows()) === before + 1, `${before} -> ${await filterRows()}`);
  check('period helper is shown for observations', await page.getByRole('button', { name: 'ADD PERIOD' }).count() === 1);
  await page.locator('input[type="date"]').nth(0).fill('2025-01-01');
  await page.locator('input[type="date"]').nth(1).fill('2025-12-31');
  await page.getByRole('button', { name: 'ADD PERIOD' }).click();
  const url = await page.locator('textarea').first().inputValue();
  check('period adds ge/lt filters with seconds',
    url.includes('PhenomenonTime/BeginPosition ge 2025-01-01T00:00:00Z') && url.includes('PhenomenonTime/BeginPosition lt 2026-01-01T00:00:00Z'), url);
  await shot('2-filters.png');

  // Error panel: observations without a valid key and without the required filter
  await page.getByRole('button', { name: 'GET', exact: true }).click();
  await page.waitForSelector('.app-problem', { timeout: 60000 });
  const problem = (await page.locator('.app-problem').innerText()).replace(/\s+/g, ' ');
  check('error panel explains the error', problem.length > 20, problem);
  await shot('3-error.png');

  // References: table view
  await chooseInSelect('Endpoint', 'References');
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'GET', exact: true }).click();
  await page.waitForSelector('table.app-result-table tbody tr', { timeout: 60000 });
  const rows = await page.locator('table.app-result-table tbody tr').count();
  const headers = await page.locator('table.app-result-table th').allInnerTexts();
  check('result is shown as a table', rows > 0, `${rows} rows, columns: ${headers.join(', ')}`);
  await shot('4-table.png');

  // CSV download
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

  // JSON view toggle
  await page.getByRole('radio', { name: 'JSON' }).click().catch(async () => {
    await page.locator('mat-button-toggle', { hasText: 'JSON' }).click();
  });
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
