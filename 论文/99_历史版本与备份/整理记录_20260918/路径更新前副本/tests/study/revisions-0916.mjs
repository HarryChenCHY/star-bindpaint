import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const out = '论文/0916验收';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:3001/');
  const demo = page.getByTestId('home-painting-demo');
  await demo.getByRole('button', { name: '暂停流程演示' }).click();
  await demo.getByRole('button', { name: '笔触序列', exact: true }).click();
  await page.getByText('② 转为有序笔触').waitFor();
  await demo.getByRole('button', { name: '跟随绘画', exact: true }).click();
  await demo.getByRole('button', { name: '播放流程演示' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/01-首页循环演示.png` });
  await page.goto('http://localhost:3001/create');
  assert.match(await page.getByRole('tab').first().innerText(), /上传图片/);
  assert.equal(await page.getByRole('tab').first().getAttribute('aria-selected'), 'true');
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fdf1c7'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#45826d'; ctx.fillRect(30, 30, 195, 180); ctx.fillStyle = '#ab4e33'; ctx.fillRect(90, 60, 80, 140);
    return c.toDataURL().split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({ name: '0916合成图.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.getByRole('button', { name: '生成星迹并开始' }).click();
  await page.getByRole('button', { name: '完整', exact: true }).waitFor({ timeout: 60000 });
  await page.screenshot({ path: `${out}/02-虚线区域引导.png` });
  await page.getByRole('button', { name: '自动续画', exact: true }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '暂停自动续画', exact: true }).last().click();
  const pixels = () => page.locator('canvas').first().evaluate(c => c.toDataURL());
  const paused = await pixels();
  await page.waitForTimeout(650); assert.equal(await pixels(), paused);
  await page.getByRole('button', { name: '自动续画', exact: true }).click();
  await page.waitForTimeout(500); assert.notEqual(await pixels(), paused);
  await page.getByRole('button', { name: '教程', exact: true }).click();
  const tutorial = page.getByRole('dialog', { name: '绘画界面完整教程' });
  await tutorial.waitFor();
  const tutorialPixels = await pixels(); await page.waitForTimeout(650); assert.equal(await pixels(), tutorialPixels);
  for (const tab of ['界面总览', '沿星迹', '自动续画', '自由星域', '月亮伙伴', '完成与保存']) {
    await tutorial.getByRole('navigation').getByRole('button', { name: tab, exact: true }).click();
    await tutorial.getByRole('heading', { name: tab, exact: true }).waitFor();
    await page.screenshot({ path: `${out}/教程-${tab}.png` });
  }
  await tutorial.getByRole('navigation').getByRole('button', { name: '沿星迹', exact: true }).click();
  const guide = tutorial.locator('canvas'); const full = await guide.evaluate(c => c.toDataURL());
  await tutorial.getByRole('button', { name: '起点', exact: true }).click();
  assert.notEqual(await guide.evaluate(c => c.toDataURL()), full);
  await page.keyboard.press('Escape'); assert.equal(await tutorial.isVisible(), false);
  assert.equal(await pixels(), tutorialPixels);
  await page.getByRole('button', { name: '自由星域', exact: true }).click();
  const brush = page.getByRole('button', { name: '星光画笔', exact: true });
  await brush.click(); await page.locator('input[type=range]').fill('3'); await brush.click();
  const box = await page.locator('canvas.paint-canvas').boundingBox();
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(box.x + box.width * .2, box.y + box.height * (.3 + i * .1));
    await page.mouse.down(); await page.mouse.move(box.x + box.width * .55, box.y + box.height * (.3 + i * .1), { steps: 18 }); await page.mouse.up();
    await page.waitForTimeout(150); assert.equal((await brush.innerText()).trim(), '3');
  }
  await page.waitForTimeout(2200); assert.equal((await brush.innerText()).trim(), '3');
  await brush.click(); await page.locator('input[type=range]').fill('16'); await brush.click();
  // 不仅检查数字，还检查引擎重建后的实时笔迹宽度。
  const widths = [];
  for (const style of ['莫奈', '梵高', '高更', '伦勃朗', '毕加索', '萨金特']) {
    await page.getByRole('button', { name: '风格', exact: true }).click();
    await page.getByRole('button', { name: style, exact: true }).click();
    await page.getByRole('button', { name: '风格', exact: true }).click();
    assert.equal((await brush.innerText()).trim(), '16');
    await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5);
    await page.mouse.down();
    if (style === '梵高') await page.waitForTimeout(2200);
    await page.mouse.move(box.x + box.width * .55, box.y + box.height * .5, { steps: 18 });
    widths.push(await page.locator('canvas.paint-canvas').evaluate(c => {
      const data = c.getContext('2d').getImageData(Math.round(c.width * .4), 0, 1, c.height).data;
      return Array.from({ length: c.height }, (_, y) => data[y * 4 + 3]).filter(a => a > 0).length;
    }));
    await page.mouse.up(); await page.waitForTimeout(150);
    assert.equal((await brush.innerText()).trim(), '16');
  }
  assert.ok(widths.every(w => w >= 8 && Math.abs(w - widths[0]) <= 1), JSON.stringify(widths));
  await page.getByRole('button', { name: '颜色', exact: true }).click();
  await page.getByRole('button', { name: '自定义颜色', exact: true }).click();
  for (const [label, value] of [['H 色相', '210'], ['S 饱和度', '60'], ['V 明度', '70']]) await page.getByRole('spinbutton', { name: label, exact: true }).fill(value);
  const preview = await page.getByRole('img', { name: '预览画笔颜色' }).evaluate(e => getComputedStyle(e).backgroundColor);
  assert.equal(preview, 'rgb(71, 125, 179)');
  const square = page.getByRole('group', { name: '饱和度与明度选色方框' });
  const squareBox = await square.boundingBox();
  await page.mouse.click(squareBox.x + squareBox.width * .5, squareBox.y + squareBox.height * .25);
  assert.ok(Math.abs(Number(await page.getByRole('spinbutton', { name: 'S 饱和度' }).inputValue()) - 50) <= 1);
  assert.ok(Math.abs(Number(await page.getByRole('spinbutton', { name: 'V 明度' }).inputValue()) - 75) <= 1);
  const wheel = await square.locator('..').boundingBox();
  await page.mouse.click(wheel.x + wheel.width - 8, wheel.y + wheel.height / 2);
  assert.ok(Math.abs(Number(await page.getByRole('spinbutton', { name: 'H 色相' }).inputValue()) - 90) <= 1);
  await page.screenshot({ path: `${out}/03-HSV选色.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('spinbutton', { name: 'V 明度', exact: true }).scrollIntoViewIfNeeded();
  const hsvBox = await page.getByTestId('hsv-picker').boundingBox();
  assert.ok(hsvBox.x >= 0 && hsvBox.x + hsvBox.width <= 390, JSON.stringify(hsvBox));
  await page.screenshot({ path: `${out}/04-手机HSV.png` });
  await page.getByRole('button', { name: '颜色', exact: true }).click();
  await page.getByRole('button', { name: '教程', exact: true }).click();
  await tutorial.getByRole('navigation').getByRole('button', { name: '月亮伙伴', exact: true }).click();
  await tutorial.getByRole('button', { name: '解锁示例卡' }).click();
  await tutorial.getByRole('slider', { name: '移动示例卡' }).fill('40');
  await tutorial.getByRole('button', { name: '收起示例卡' }).click();
  await page.screenshot({ path: `${out}/05-手机教程.png` });
  assert.equal(await tutorial.evaluate(e => e.scrollWidth > innerWidth), false);
  await tutorial.getByRole('button', { name: '关闭教程返回画板' }).click();
  assert.equal((await brush.innerText()).trim(), '16');
  assert.deepEqual(errors, []);
  console.log('PASS: 0916 首页、上传默认、自动续画暂停恢复、教程不改作品、三档引导、笔宽保持、HSV及390px布局');
} finally { await browser.close(); }
