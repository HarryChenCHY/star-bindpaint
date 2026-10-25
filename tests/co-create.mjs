import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const output = '/tmp/startrace-co-create';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/`);
  await page.getByRole('button', { name: '参与测试', exact: true }).click();
  await page.waitForURL(`${base}/study`);
  assert.equal((await page.request.get(`${base}/admin/studies`)).status(), 200);
  await page.goto(`${base}/create`);
  assert.equal(await page.getByRole('button', { name: /临摹/ }).count(), 0);
  await page.getByRole('button', { name: '从空白开始共创' }).click();
  const canvas = page.getByTestId('co-canvas');
  await canvas.waitFor();
  const pixels = () => canvas.evaluate(c => c.toDataURL());
  const blank = await pixels();
  await page.getByRole('button', { name: '添加花朵' }).click();
  const preview = page.getByTestId('material-preview');
  await preview.waitFor();
  assert.equal(await pixels(), blank, 'preview must not paint the canvas');
  await preview.focus();
  for (let i = 0; i < 14; i++) await page.keyboard.press('ArrowLeft');
  const beforeConfirm = Date.now();
  // Check synchronous click before a worker has any opportunity to emit strokes.
  const immediate = await page.getByRole('button', { name: '确认并续绘' }).evaluate(b => {
    b.click();
    return document.querySelector('[data-testid="co-canvas"]').toDataURL();
  });
  assert.equal(immediate, blank, 'confirmation cannot paste a bitmap');
  await preview.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-testid="co-canvas"]');
    return c.getContext('2d').getImageData(0, 0, 640, 480).data.some((v, i) => i % 4 !== 3 && v < 240);
  }, undefined, { timeout: 60000 });
  console.log('PASS first visible stroke after confirmation:', Date.now() - beforeConfirm, 'ms');
  await page.getByRole('button', { name: '暂停绘制', exact: true }).click();
  const paused = await pixels();
  await page.waitForTimeout(800);
  assert.equal(await pixels(), paused, 'pause must stop actual drawing');
  await page.getByRole('button', { name: '添加云朵' }).click();
  await preview.waitFor();
  const box = await canvas.boundingBox();
  const pb = await preview.boundingBox();
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .25, { steps: 8 });
  await page.mouse.up();
  await page.getByRole('button', { name: '确认并续绘' }).click();
  await page.getByRole('button', { name: '添加太阳' }).click();
  await preview.waitFor();
  await preview.focus();
  for (let i = 0; i < 18; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowDown');
  await page.getByRole('button', { name: '确认并续绘' }).click();
  await page.getByLabel('绘制节奏').selectOption('20');
  await page.getByText('这一轮绘制完成。可以保存，也可以继续加入素材。', { exact: true }).waitFor({ timeout: 90000 });
  assert.equal(await page.locator('.co-history span').count(), 3);
  assert.equal(await page.getByRole('button', { name: /撤销|删除素材/ }).count(), 0);
  assert.notEqual(await pixels(), paused);
  const coloredRegions = await canvas.evaluate(c => {
    const ctx = c.getContext('2d');
    return [[100, 140, 200, 200], [360, 45, 180, 150], [380, 255, 180, 180]].map(([x,y,w,h]) => {
      const data = ctx.getImageData(x,y,w,h).data;
      return data.filter((v, i) => i % 4 !== 3 && v < 220).length;
    });
  });
  assert.ok(coloredRegions.every(n => n > 800), JSON.stringify(coloredRegions));
  await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
  const complete = await pixels();
  await page.getByRole('button', { name: '添加花朵' }).click();
  await preview.waitFor();
  await page.getByRole('button', { name: '保存到星图' }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('star-bindpaint-gallery'))[0].imageDataUrl), complete, 'save excludes material preview');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await pixels(), complete);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载图片' }).click();
  await (await download).saveAs(`${output}/artwork.png`);
  console.log('PASS pause, streaming replacement, three retained materials, cancellation, save and download');

  await page.goto(`${base}/create`);
  await page.getByRole('tab', { name: /自由画布/ }).click();
  await page.getByRole('button', { name: '打开自由画布' }).click();
  const free = page.locator('canvas.paint-canvas');
  await free.waitFor();
  const freePixels = () => page.evaluate(() => window.__paintCanvas.getBaseCanvas().toDataURL());
  const freeBlank = await freePixels();
  await page.getByRole('button', { name: '收起月亮伙伴' }).click();
  const f = await free.boundingBox();
  assert.ok(f.width > 200 && f.height > 150, JSON.stringify(f));
  await page.mouse.move(f.x + f.width * .25, f.y + f.height * .5);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width * .6, f.y + f.height * .5, { steps: 20 });
  await page.mouse.up();
  assert.ok(await freePixels() !== freeBlank, 'freehand stroke must reach base canvas');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  assert.equal(await freePixels(), freeBlank);
  assert.equal(await page.getByRole('button', { name: '风格', exact: true }).count(), 0);
  await page.mouse.move(f.x + f.width * .2, f.y + f.height * .5);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width * .7, f.y + f.height * .5, { steps: 20 });
  await page.mouse.up();
  const styled = await freePixels();
  assert.ok(styled !== freeBlank, 'ordinary brush must paint');
  await page.getByRole('button', { name: '橡皮擦', exact: true }).click();
  await page.mouse.move(f.x + f.width * .4, f.y + f.height * .48);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width * .4, f.y + f.height * .52, { steps: 12 });
  await page.mouse.up();
  assert.ok(await freePixels() !== styled, 'eraser must remove visible paint');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  assert.equal(await freePixels(), styled, 'eraser undo restores paint');
  await page.getByRole('button', { name: '橡皮擦', exact: true }).click();
  await page.getByRole('button', { name: '喷枪', exact: true }).click();
  await page.mouse.move(f.x + f.width * .5, f.y + f.height * .3);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width * .7, f.y + f.height * .3, { steps: 15 });
  await page.mouse.up();
  assert.ok(await freePixels() !== styled, 'spray paints visible marks');
  await page.getByRole('button', { name: '喷枪', exact: true }).click();
  await page.getByRole('button', { name: '颜色', exact: true }).click();
  await page.getByRole('button', { name: /自定义/ }).click();
  await page.locator('[data-testid="hsv-picker"]:visible').waitFor();
  await page.locator('[data-testid="hsv-picker"]:visible').getByLabel('H 色相').fill('180');
  await page.screenshot({ path: `${output}/free-color.png`, fullPage: true });
  await page.getByRole('button', { name: '颜色', exact: true }).click();
  await page.getByRole('button', { name: '完成并保存', exact: true }).click();
  await page.getByAltText('当前作品预览').waitFor();
  await page.getByRole('button', { name: '保存到星图' }).click();
  await page.getByRole('button', { name: '继续绘画', exact: true }).click();
  await page.screenshot({ path: `${output}/free.png`, fullPage: true });
  console.log('PASS ordinary brush, HSV colour, spray, eraser, undo and save preview');

  await page.goto(`${base}/create`);
  await page.getByLabel('选择本地参考图片').setInputFiles(`${output}/artwork.png`);
  await page.getByRole('button', { name: '带着照片开始共创' }).click();
  await canvas.waitFor();
  await page.waitForFunction(() => /已绘制 [1-9]/.test(document.body.innerText), undefined, { timeout: 60000 });
  await page.getByRole('button', { name: '添加云朵' }).click();
  await preview.waitFor();
  const photoPaused = await pixels();
  await page.waitForTimeout(500);
  assert.equal(await pixels(), photoPaused);
  await page.getByRole('button', { name: '确认并续绘' }).click();
  await page.getByLabel('绘制节奏').selectOption('20');
  await page.getByText('这一轮绘制完成。可以保存，也可以继续加入素材。', { exact: true }).waitFor({ timeout: 90000 });
  assert.ok(await pixels() !== photoPaused);
  await page.screenshot({ path: `${output}/photo.png`, fullPage: true });
  console.log('PASS uploaded image auto-paint and material insertion mid-drawing');

  await page.goto(`${base}/create`);
  await page.getByRole('button', { name: '从空白开始共创' }).click();
  await page.getByRole('button', { name: '添加太阳' }).click();
  await preview.waitFor();
  await page.evaluate(() => {
    const Original = window.Worker;
    window.Worker = class extends Original {
      constructor(...args) {
        super(...args);
        this.terminate();
        setTimeout(() => this.onerror?.(new ErrorEvent('error')), 20);
        window.Worker = Original;
      }
    };
  });
  await page.getByRole('button', { name: '确认并续绘' }).click();
  await page.locator('.creation-error').waitFor();
  assert.equal(await page.locator('.co-history span').count(), 1);
  await page.getByRole('button', { name: '重试续绘' }).click();
  await page.getByLabel('绘制节奏').selectOption('20');
  await page.getByText('这一轮绘制完成。可以保存，也可以继续加入素材。', { exact: true }).waitFor({ timeout: 90000 });
  assert.equal(await page.locator('.creation-error').count(), 0);
  assert.equal(await page.locator('.co-history span').count(), 1);
  console.log('PASS worker failure preserves confirmation and retry resumes');

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/create', '/gallery', '/intro', '/settings']) {
    await page.goto(`${base}${route}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `mobile overflow ${route}`);
  }
  await page.goto(`${base}/create`);
  await page.getByRole('tab', { name: /自由画布/ }).click();
  await page.getByRole('button', { name: '打开自由画布' }).click();
  await page.getByRole('button', { name: '颜色', exact: true }).click();
  await page.getByRole('button', { name: '自定义颜色', exact: true }).click();
  await page.locator('[data-testid="hsv-picker"]:visible').waitFor();
  const palette = await page.locator('[data-paint-popover]').boundingBox();
  assert.ok(palette.x >= 8 && palette.x + palette.width <= 382 && palette.y >= 65, `clipped colour picker: ${JSON.stringify(palette)}`);
  await page.goto(`${base}/create`);
  await page.getByRole('button', { name: '从空白开始共创' }).click();
  await page.getByRole('button', { name: '添加云朵' }).click();
  await preview.waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${output}/mobile.png`, fullPage: true });
  for (const [from, to] of [['/onboard','/create'],['/simplify','/create'],['/report','/gallery']]) {
    await page.goto(`${base}${from}`);
    await page.waitForURL(`${base}${to}`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS mobile layout, legacy redirects and no browser exceptions');
} finally { await browser.close(); }
