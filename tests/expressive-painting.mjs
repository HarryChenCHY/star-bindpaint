import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const output = '/tmp/startrace-expressive';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/create`);
  await page.getByRole('button', { name: '从空白开始共创' }).click();
  const canvas = page.getByTestId('co-canvas');
  await canvas.waitFor();
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  const pixels = () => canvas.evaluate(c => c.toDataURL());
  const blank = await pixels();
  await page.getByLabel('配色气氛').selectOption('sunlit');
  await page.getByRole('button', { name: '应用并续绘' }).click();
  assert.equal(await pixels(), blank, 'choosing a palette must not paste pixels');
  await page.getByRole('button', { name: '添加花朵' }).click();
  const preview = page.getByTestId('material-preview');
  await page.getByRole('button', { name: '确认并续绘' }).waitFor();
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent.includes('换个样子')).disabled);
  const src = await preview.locator('img').getAttribute('src');
  await page.getByRole('button', { name: '换个样子' }).click();
  await page.waitForFunction(old => document.querySelector('[data-testid="material-preview"] img')?.src !== old, src);
  assert.equal(await pixels(), blank);
  const before = await preview.boundingBox();
  await preview.focus();
  for (let i = 0; i < 16; i++) await page.keyboard.press('ArrowLeft');
  const after = await preview.boundingBox();
  const canvasBox = await canvas.boundingBox();
  assert.ok(Math.abs((before.x - after.x) - 128 * canvasBox.width / 640) < 2, 'rapid keyboard input must not be lost to asynchronous palette preparation');
  await page.getByLabel('协调周围配色').uncheck();
  const immediate = await page.getByRole('button', { name: '确认并续绘' }).evaluate(b => {
    if (b.disabled) return null;
    b.click(); return document.querySelector('[data-testid="co-canvas"]').toDataURL();
  });
  if (immediate === null) {
    await page.getByRole('button', { name: '确认并续绘' }).click();
  } else assert.equal(immediate, blank, 'confirmation only updates the hidden target');
  await page.getByLabel('绘制节奏').selectOption('20');
  await page.getByText('这一轮绘制完成。可以保存，也可以继续加入素材。', { exact: true }).waitFor({ timeout: 90000 });
  const first = await pixels();
  assert.notEqual(first, blank);
  // A distant white patch must stay clean, including pigment highlights and cleanup strokes.
  const paper = await canvas.evaluate(c => {
    const d = c.getContext('2d').getImageData(520, 20, 100, 80).data;
    let affected = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.min(d[i], d[i + 1], d[i + 2]) < 250) affected++;
    return affected / (100 * 80);
  });
  assert.ok(paper < .01, `untouched paper has visible marks: ${paper}`);
  await page.getByLabel('配色气氛').selectOption('dusk');
  await page.getByRole('slider', { name: '色块概括' }).fill('90');
  assert.equal(await pixels(), first, 'unapplied controls do not alter the work');
  await page.getByRole('button', { name: '应用并续绘' }).click();
  await page.getByText('这一轮绘制完成。可以保存，也可以继续加入素材。', { exact: true }).waitFor({ timeout: 90000 });
  assert.notEqual(await pixels(), first, 'applying a new mood must reach the actual canvas');
  assert.equal(await page.locator('.co-history span').count(), 1);
  await page.screenshot({ path: `${output}/controls-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '添加太阳' }).click();
  await preview.waitFor();
  await page.getByRole('button', { name: '换个样子' }).click();
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent.includes('换个样子')).disabled);
  await page.screenshot({ path: `${output}/controls-mobile.png`, fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  assert.ok(requests.every(u => new URL(u).origin === new URL(base).origin), 'creative controls must not contact an external service');
  assert.ok(requests.every(u => !new URL(u).pathname.startsWith('/api/')), 'creative controls must not call an API');
  console.log('PASS material variation, rapid movement, harmony preview, deferred palette application, clean paper, mobile layout and local-only processing');
} finally { await browser.close(); }
