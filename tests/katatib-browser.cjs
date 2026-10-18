// Real-browser acceptance checks for fictional preview data only.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const directory = path.resolve(__dirname, '../public/katatib');
const output = path.resolve(process.env.KATATIB_SCREENSHOTS || 'artifacts/katatib');
fs.mkdirSync(output, { recursive: true });
const errors = [], databaseRequests = [];
const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  let file = path.resolve(directory, relative);
  if (file.startsWith(directory + path.sep) && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(directory + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
  response.setHeader('Cache-Control', 'no-store');
  response.end(fs.readFileSync(file));
});
let browser;
async function trackedPage(context) {
  await context.route('**/*', route => {
    const url = route.request().url();
    if (/firestore\.googleapis|identitytoolkit|firebaseio/.test(url)) databaseRequests.push(url);
    // Avoid remote font dependencies for reproducible checks/screenshots.
    return new URL(url).hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return page;
}
async function waitFor(condition, page) {
  await page.waitForFunction(condition);
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/demo/`;
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await trackedPage(desktop);
  await page.goto(base);
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  await page.locator('[data-language=fr]').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
  assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
  await page.locator('[data-student="demo-01"][data-status=absent]').click();
  const note = 'Absence à confirmer. <img src=x onerror="window.__injected=1">';
  await page.locator('#student-note').fill(note);
  await page.locator('[data-action=save]').click();
  await page.reload();
  assert.equal(await page.locator('[data-student="demo-01"][data-status=absent]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#student-note').inputValue(), note);
  await page.locator('[data-session=afternoon]').click();
  assert.equal(await page.locator('[data-student="demo-01"][data-status=absent]').getAttribute('aria-pressed'), 'false');
  await page.locator('[data-student="demo-01"][data-status=present]').click();
  await page.locator('[data-action=save]').click();
  await page.locator('[data-session=morning]').click();
  assert.equal(await page.locator('[data-student="demo-01"][data-status=absent]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-action=next]').click();
  await page.locator('[data-student="demo-02"][data-status=late]').click();
  await page.locator('[data-action=save]').click();
  await page.locator('.sidebar nav a[href="#attendance"]').click();
  await page.locator('[data-action=mark-rest]').click();
  assert.equal(await page.locator('[data-student="demo-01"][data-status=absent]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-student="demo-02"][data-status=late]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-action=save]').click();
  await page.screenshot({ path: path.join(output, 'desktop-attendance-fr.png'), fullPage: true });
  await page.locator('[data-profile="demo-01"]').click();
  assert.equal(await page.getByRole('dialog').isVisible(), true);
  assert.equal(await page.locator('.history-entry').count(), 2);
  assert.ok((await page.getByRole('dialog').innerText()).includes(note));
  assert.equal(await page.getByRole('dialog').locator('img').count(), 0);
  assert.equal(await page.evaluate(() => window.__injected), undefined);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.locator('.sidebar nav a[href="#students"]').click();
  await page.locator('#student-search').fill('Maryam');
  assert.equal(await page.locator('.student-card').count(), 1);
  await page.locator('#student-search').fill('<img src=x>');
  assert.equal(await page.locator('.student-card').count(), 0);
  await page.locator('#student-search').fill('');
  await page.locator('#group-select').selectOption('nour');
  assert.equal(await page.locator('.student-card').count(), 4);
  assert.equal(await page.locator('[data-profile="demo-01"]').count(), 0);
  await page.locator('#group-select').selectOption('fajr');
  await page.locator('.sidebar nav a[href="#today"]').click();
  await page.locator('[data-language=ar]').click();
  await page.screenshot({ path: path.join(output, 'desktop-today-ar.png'), fullPage: true });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await trackedPage(mobile);
  await phone.goto(base);
  for (const route of ['today', 'students', 'attendance']) {
    await phone.locator(`.mobile-nav a[href="#${route}"]`).click();
    await waitFor(() => document.documentElement.scrollWidth <= window.innerWidth + 1, phone);
    await phone.screenshot({ path: path.join(output, `mobile-${route}-ar.png`), fullPage: true });
  }
  await phone.locator('[data-language=fr]').click();
  await waitFor(() => document.documentElement.scrollWidth <= window.innerWidth + 1, phone);
  await phone.screenshot({ path: path.join(output, 'mobile-attendance-fr.png'), fullPage: true });
  await mobile.close();
  const broken = await browser.newContext();
  await broken.addInitScript(() => { try { localStorage.setItem('katatib.preview.attendance.v1', '{broken'); } catch {} });
  const bad = await trackedPage(broken); await bad.goto(base);
  assert.equal(await bad.getByRole('alert').isVisible(), true);
  await bad.locator('[data-status=present]').click();
  assert.equal(await bad.locator('[data-action=save]').isDisabled(), true);
  assert.equal(await bad.evaluate(() => localStorage.getItem('katatib.preview.attendance.v1')), '{broken');
  await broken.close();
  const full = await browser.newContext();
  await full.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Storage quota exceeded'); }; });
  const blocked = await trackedPage(full); await blocked.goto(base);
  await blocked.locator('[data-status=present]').click();
  await blocked.locator('[data-action=save]').click();
  assert.equal(await blocked.locator('[data-save-state]').getAttribute('class'), 'save-state error');
  assert.equal(await blocked.evaluate(() => localStorage.getItem('katatib.preview.attendance.v1')), null);
  await full.close();
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  assert.deepEqual(databaseRequests, [], 'No Firebase database/auth requests');
  console.log('PASS: Arabic/French, mobile layouts, attendance save/reload, session/group isolation, profile history, escaped input, search, dialog keyboard, corrupt data and storage failure.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  server.close();
});
