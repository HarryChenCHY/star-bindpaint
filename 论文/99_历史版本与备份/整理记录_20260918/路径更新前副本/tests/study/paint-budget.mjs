import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = join(process.cwd(), '论文/1000笔算法验证');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:3001/simplify');
  const report = [];
  for (const [name, button] of [['盆栽', '试试盆栽'], ['日出油画', '试试油画']]) {
    const start = Date.now();
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.getByRole('heading', { name: '逐笔查看绘画顺序' }).waitFor({ timeout: 120000 });
    const labels = await page.locator('h2').allTextContents();
    const mae = await page.locator('p').filter({ hasText: '平均像素色差 MAE' }).allTextContents();
    const count = +await page.getByRole('slider', { name: '预览笔数' }).getAttribute('max');
    if (!count || count > 1000) throw new Error('Invalid stroke budget');
    const images = await page.locator('img').evaluateAll(elements => elements.filter(e => e.src.startsWith('data:')).map(e => ({ alt: e.alt, url: e.src })));
    for (const im of images) writeFileSync(join(out, `${name}-${im.alt}.png`), Buffer.from(im.url.split(',')[1], 'base64'));
    await page.screenshot({ path: join(out, `${name}-页面.png`), fullPage: true });
    report.push({ name, labels, mae, count, elapsedMs: Date.now() - start });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile overflow');
  await page.screenshot({ path: join(out, '手机预览.png'), fullPage: true });
  await page.evaluate(() => sessionStorage.setItem('star-bindpaint-free-style', 'test-stale-style'));
  await page.getByRole('button', { name: '用这张图开始逐笔绘画' }).click();
  await page.waitForURL('**/paint');
  await page.waitForTimeout(3500);
  if (await page.evaluate(() => sessionStorage.getItem('star-bindpaint-free-style'))) throw new Error('Stale free mode');
  await page.screenshot({ path: join(out, '手机逐笔绘画.png'), fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  writeFileSync(join(out, '对比数据.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report, out }));
} finally { await browser.close(); }
