// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const PAGE = 'file://' + path.join(__dirname, '..', 'subject-sheet-generator', 'index.html');
const FIXTURE_IMG = path.join(__dirname, '..', 'assets', 'og-home.jpg');

const FAKE_DESCRIPTOR = {
  age_range: 'late twenties',
  build: 'lean athletic frame, narrow shoulders',
  face_structure: 'oval face, defined jawline',
  skin: 'olive tone, light freckling across nose',
  hair: 'shoulder length dark brown hair, natural wave',
  eyes: 'almond shaped eyes, medium palpebral aperture, level canthal tilt, visible upper lid crease',
  distinguishing: 'small scar above left eyebrow',
  wardrobe: 'grey crew neck t-shirt, dark blue jeans',
  accessories: 'silver watch on left wrist, black leather bracelet on right wrist',
};

/**
 * Every test loads the page fresh with console/pageerror capture wired
 * before navigation, so an uncaught exception at first load (the kind
 * that hid a temporal-dead-zone bug in production) fails the test.
 */
async function openPage(page) {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err));
  await page.goto(PAGE);
  return pageErrors;
}

async function uploadSubject(page) {
  await page.setInputFiles('#file', FIXTURE_IMG);
  await expect(page.locator('#stage-wrap')).toBeVisible();
  await expect(page.locator('#btn-read')).toBeEnabled();
}

async function mockVisionCall(page, { status = 200, body, rawText } = {}) {
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    if (rawText !== undefined) {
      await route.fulfill({ status, contentType: 'text/plain', body: rawText });
      return;
    }
    const payload = body ?? {
      content: [{ type: 'text', text: JSON.stringify(FAKE_DESCRIPTOR) }],
    };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

test('loads with no uncaught exceptions', async ({ page }) => {
  const pageErrors = await openPage(page);
  expect(pageErrors).toEqual([]);
});

test('upload enables the read button and shows a preview', async ({ page }) => {
  await openPage(page);
  await uploadSubject(page);
});

test('rejects a non-image file with a clear status message, no crash', async ({ page }) => {
  const pageErrors = await openPage(page);
  const textFile = path.join(__dirname, 'fixtures', 'not-an-image.txt');
  await page.setInputFiles('#file', textFile);
  await expect(page.locator('#st-read')).toContainText('immagine');
  expect(pageErrors).toEqual([]);
});

test('happy path: vision call, descriptor, plate approval, matrix, sheet, export', async ({ page }) => {
  const pageErrors = await openPage(page);
  await mockVisionCall(page);
  await uploadSubject(page);

  await page.click('#btn-read');
  await expect(page.locator('#p-desc')).toBeVisible();
  await expect(page.locator('#fd_eyes')).toHaveValue(FAKE_DESCRIPTOR.eyes);
  await expect(page.locator('#fd_accessories')).toHaveValue(FAKE_DESCRIPTOR.accessories);

  // approval gate
  await page.click('#btn-approve');
  await expect(page.locator('#p-matrix')).toHaveCSS('opacity', '1');
  await expect(page.locator('#p-out')).toBeVisible();

  // matrix defaults to a non-zero cell count
  const cellCount = await page.locator('#n-cells').innerText();
  expect(Number(cellCount)).toBeGreaterThan(0);

  // JSON export carries the canonical string and locked accessories
  const jsonText = await page.locator('#out').innerText();
  const parsed = JSON.parse(jsonText);
  expect(parsed.identity.canonical_string).toContain('shoulder length dark brown hair');
  expect(parsed.identity.negative_constraints).toContain('NO REMOVED ACCESSORIES');
  expect(parsed.sheet.cell_count).toBe(Number(cellCount));

  // fill the sheet compositor in bulk and export both PNG modes
  const bulkFiles = [FIXTURE_IMG, FIXTURE_IMG, FIXTURE_IMG];
  await page.setInputFiles('#bulk', bulkFiles);
  await expect(page.locator('#n-filled')).toContainText('3 /');

  const [machineDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#btn-png'),
  ]);
  expect(machineDownload.suggestedFilename()).toBe('subject-plate.png');

  await page.click('[data-mode="human"]');
  const [humanDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#btn-png'),
  ]);
  expect(humanDownload.suggestedFilename()).toBe('subject-sheet.png');

  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#btn-json'),
  ]);
  expect(jsonDownload.suggestedFilename()).toBe('subject-identity.json');

  expect(pageErrors).toEqual([]);
});

test('vision call: non-JSON body falls back to manual field entry without crashing', async ({ page }) => {
  const pageErrors = await openPage(page);
  await mockVisionCall(page, { rawText: '<html>not json</html>' });
  await uploadSubject(page);
  await page.click('#btn-read');

  await expect(page.locator('#p-desc')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#st-read')).toContainText('non riuscita');
  expect(pageErrors).toEqual([]);
});

test('vision call: empty 200 body falls back to manual field entry without crashing', async ({ page }) => {
  const pageErrors = await openPage(page);
  await mockVisionCall(page, { rawText: '' });
  await uploadSubject(page);
  await page.click('#btn-read');

  await expect(page.locator('#p-desc')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#st-read')).toContainText('non riuscita');
  expect(pageErrors).toEqual([]);
});

test('vision call: HTTP 400 surfaces the API error message, no crash', async ({ page }) => {
  const pageErrors = await openPage(page);
  await mockVisionCall(page, {
    status: 400,
    body: { error: { message: 'messages.0.content.0.image.source.base64.data: invalid image data' } },
  });
  await uploadSubject(page);
  await page.click('#btn-read');

  await expect(page.locator('#st-read')).toContainText('invalid image data', { timeout: 15000 });
  expect(pageErrors).toEqual([]);
});

test('vision call: HTTP 429 retries once and then falls back cleanly', async ({ page }) => {
  const pageErrors = await openPage(page);
  let calls = 0;
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    calls++;
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'rate limited' } }),
    });
  });
  await uploadSubject(page);
  await page.click('#btn-read');

  await expect(page.locator('#p-desc')).toBeVisible({ timeout: 15000 });
  expect(calls).toBeGreaterThan(1);
  expect(pageErrors).toEqual([]);
});

test('undecodable image is rejected with guidance, no crash', async ({ page }) => {
  const pageErrors = await openPage(page);
  const garbage = path.join(__dirname, 'fixtures', 'garbage.jpg');
  await page.setInputFiles('#file', garbage);
  await expect(page.locator('#st-read')).toContainText('non è leggibile', { timeout: 10000 });
  expect(pageErrors).toEqual([]);
});
