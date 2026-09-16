import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const out = '论文/方案A接入验收';
mkdirSync(out, { recursive: true });
const bundle = await build({ stdin: { contents: "export { planBudgetStrokes } from './src/lib/budget-strokes'; export { imageSourceFromImage, drawStroke } from './src/lib/stroke-engine';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'Lab' });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const result = await page.evaluate(async url => {
    const img = new Image(); img.src = url; await img.decode();
    const width = 768, height = Math.round(width * img.naturalHeight / img.naturalWidth);
    const strokes = await Lab.planBudgetStrokes(Lab.imageSourceFromImage(img), width, height, 1000, 1, .85);
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height);
    const stages = [];
    strokes.forEach((s, i) => {
      Lab.drawStroke(ctx, s, .85);
      if (s.planning.passIndex !== strokes[i + 1]?.planning.passIndex) stages.push({ pass: s.planning.passIndex + 1, count: i + 1, image: c.toDataURL() });
    });
    return { strokes, stages };
  }, `data:image/jpeg;base64,${readFileSync('public/masterworks/monet/impression_sunrise.jpg').toString('base64')}`);
  const expected = JSON.parse(readFileSync('论文/笔触顺序探索_不接入正式程序/raster-序列.json', 'utf8'));
  assert.deepEqual(result.strokes.map(({ points, width, color }) => ({ points, width, color })), expected.strokes.map(({ points, width, color }) => ({ points, width, color })));
  for (const s of result.stages) writeFileSync(`${out}/莫奈-第${s.pass}遍-${s.count}笔.png`, Buffer.from(s.image.split(',')[1], 'base64'));
  writeFileSync(`${out}/验收数据.json`, JSON.stringify({ count: result.strokes.length, stages: result.stages.map(({pass,count}) => ({pass,count})), exactPrototypeMatch: true }, null, 2));
  console.log('PASS: production matches approved A geometry/color exactly; stages', result.stages.map(s => s.count));
} finally { await browser.close(); }
