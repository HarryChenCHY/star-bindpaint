import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://localhost:3001/create');
  await page.evaluate(() => {
    sessionStorage.setItem('star-bindpaint-free-style', 'vangogh');
    sessionStorage.setItem('star-bindpaint-difficulty', 'free');
    sessionStorage.removeItem('star-bindpaint-source');
  });
  await page.goto('http://localhost:3001/paint');
  await page.locator('canvas.paint-canvas').waitFor();
  assert.equal(await page.getByRole('button', { name: /AI 星光变换/ }).count(), 0);
  const colors = page.getByRole('button', { name: '颜色', exact: true });
  await colors.click();
  await page.getByTitle('黄', { exact: true }).click();
  for (const [label, value] of [['饱和度', .6], ['亮度', 1.3]]) {
    const track = page.getByText(label, { exact: true }).locator('../..').locator('.relative').first();
    const box = await track.boundingBox();
    await page.mouse.click(box.x + box.width * (value - .2) / 1.8, box.y + box.height / 2);
  }
  const preview = await page.getByRole('img', { name: '预览画笔颜色' }).evaluate(el => getComputedStyle(el).backgroundColor);
  const expected = preview.match(/\d+/g).map(Number);
  assert.ok(expected[0] > 250 && expected[1] > 225 && expected[2] > 100, preview);
  await colors.click();
  const box = await page.locator('canvas.paint-canvas').boundingBox();
  // Compare opaque stroke interiors on both a white and a coloured ground.
  for (const background of ['#ffffff', '#587b69']) {
    await page.locator('canvas').first().evaluate((c, color) => {
      const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height);
    }, background);
    await page.mouse.move(box.x + box.width * .25, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .55, box.y + box.height * .5, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const actual = await page.locator('canvas').first().evaluate(c => Array.from(c.getContext('2d').getImageData(Math.round(c.width * .4), Math.round(c.height * .5), 1, 1).data).slice(0, 3));
    assert.ok(actual.every((v, i) => Math.abs(v - expected[i]) <= 20), JSON.stringify({ background, expected, actual }));
    console.log('PASS: stroke colour', { background, expected, actual });
  }
  assert.equal((await page.request.get('http://localhost:3001/api/sd-render')).status(), 404);
  console.log('PASS: image transformation UI and API removed');
} finally {
  await browser.close();
}
