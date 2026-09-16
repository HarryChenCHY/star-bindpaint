import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch();
const out = '论文/产品介绍算法溯源验收';
mkdirSync(out, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3001/intro');
  const styles = page.getByRole('group', { name: '六种大师笔触' });
  const names = ['莫奈', '梵高', '高更', '伦勃朗', '毕加索', '萨金特'];
  for (const name of names) {
    const button = styles.getByRole('button', { name: new RegExp(name) });
    await button.click(); assert.equal(await button.getAttribute('aria-pressed'), 'true');
    const evidence = page.getByTestId('style-evidence');
    assert.ok((await evidence.innerText()).includes(name));
    assert.equal(await evidence.locator('a[target=_blank]').count(), 1);
    assert.ok((await evidence.locator('a').getAttribute('href')).startsWith('https://'));
    await evidence.getByRole('img').waitFor();
  }
  await page.getByTestId('style-evidence').screenshot({ path: `${out}/大师风格来源.png` });
  const scan = page.getByTestId('scan-explorer');
  for (let i = 0; i < 5; i++) {
    await scan.getByRole('button', { name: new RegExp(`第${i + 1}遍`) }).click();
    const img = scan.locator('img');
    await img.evaluate(async el => { await el.decode(); });
    assert.ok((await img.getAttribute('alt')).includes(`第${i + 1}遍`));
    await scan.getByRole('slider').fill('100');
    const cells = [9, 16, 25, 36, 36][i];
    assert.ok((await scan.innerText()).includes(`扫描区域 ${cells} / ${cells}`));
  }
  await scan.screenshot({ path: `${out}/五遍扫描与真实结果.png` });
  const mix = page.getByRole('button', { name: '交换两笔顺序' });
  await mix.click(); await page.getByText('先蓝后黄：交叠处偏黄', { exact: true }).waitFor();
  await mix.click(); await page.getByText('先黄后蓝：交叠处偏蓝', { exact: true }).waitFor();
  const paperLinks = page.locator('#references .intro-reference-links a');
  assert.equal(await paperLinks.count(), 12);
  const missing = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(id => !document.getElementById(id)));
  assert.deepEqual(missing, []);
  const metrics = await (await page.request.get('http://localhost:3001/intro/painting-order/metrics.json')).json();
  assert.equal(metrics.metrics.find(m => m.id === 'raster').count, 998);
  await page.getByRole('button', { name: '运行笔触演示', exact: true }).click();
  await page.getByText('计算完成。拖动下方滑块，观察完整序列中的任意进度。', { exact: true }).waitFor({ timeout: 120000 });
  const preview = page.getByRole('slider', { name: /预览笔数/ });
  await preview.fill('0'); assert.equal(await preview.inputValue(), '0');
  await page.setViewportSize({ width: 390, height: 844 });
  const closeNav = page.getByRole('button', { name: '收起介绍目录', exact: true });
  if (await closeNav.isVisible()) await closeNav.click();
  await page.getByRole('button', { name: '展开介绍目录', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: /1000 笔算法/ }).click();
  assert.equal(await page.getByRole('button', { name: '展开介绍目录', exact: true }).isVisible(), true);
  await scan.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: `${out}/手机端.png` });
  assert.deepEqual(errors, []);
  console.log('PASS: 6 style citations/parameters, 5 passes/real images, order demo, 4 papers/12 links, real Worker, mobile navigation/layout');
} finally { await browser.close(); }
