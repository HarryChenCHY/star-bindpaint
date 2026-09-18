import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:3001/create');
  await page.evaluate(async () => {
    const img = new Image(); img.src = '/masterworks/monet/impression_sunrise.jpg'; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 400;
    canvas.getContext('2d').drawImage(img, 0, 0, 512, 400);
    sessionStorage.setItem('star-bindpaint-source', canvas.toDataURL());
    sessionStorage.removeItem('star-bindpaint-free-style');
  });
  await page.goto('http://127.0.0.1:3001/paint');
  await page.getByRole('button', { name: '取消规划', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: '已取消规划' }).waitFor();
  await page.getByRole('button', { name: '重新生成', exact: true }).click();
  await page.getByText(/画面优化 \d+%/).waitFor({ timeout: 30000 });
  await page.getByText('沿星迹绘画', { exact: true }).waitFor({ timeout: 120000 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('390px overflow');
  mkdirSync('论文/P6_整合验收', { recursive: true });
  await page.screenshot({ path: '论文/P6_整合验收/1000笔取消重试后进入画板.png', fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: real Worker cancellation, retry, progress, painting and 390px');
} finally { await browser.close(); }
