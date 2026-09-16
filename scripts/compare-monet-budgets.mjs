import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.cwd(), '论文/莫奈日出_六档笔触对比');
mkdirSync(out, { recursive: true });
const bundle = await build({ stdin: { contents: "export { planBudgetStrokes } from './src/lib/budget-strokes'; export { imageSourceFromImage, drawStroke } from './src/lib/stroke-engine'; export { STROKE_CONFIG } from './src/lib/stroke-config';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'PaintingComparison', platform: 'browser' });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1860, height: 1600 }, deviceScaleFactor: 1 });
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const source = `data:image/jpeg;base64,${readFileSync('public/masterworks/monet/impression_sunrise.jpg').toString('base64')}`;
  await page.evaluate(async source => {
    const image = new Image(); image.src = source; await image.decode();
    const ratio = Math.min(1, 768 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * ratio), height = Math.round(image.naturalHeight * ratio);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height); ctx.drawImage(image, 0, 0, width, height);
    window.comparison = { source: PaintingComparison.imageSourceFromImage(image), width, height, original: canvas.toDataURL(), pixels: ctx.getImageData(0, 0, width, height).data };
  }, source);
  const report = [];
  for (const budget of [100, 200, 300, 500, 700, 1000]) {
    const result = await page.evaluate(async budget => {
      const { source, width, height, pixels } = window.comparison;
      const { planBudgetStrokes, drawStroke, STROKE_CONFIG } = PaintingComparison;
      const start = performance.now();
      const strokes = await planBudgetStrokes(source, width, height, budget, STROKE_CONFIG.defaultRoughness, STROKE_CONFIG.experienceOpacity);
      const elapsedMs = Math.round(performance.now() - start);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height);
      strokes.forEach(s => drawStroke(ctx, s, STROKE_CONFIG.experienceOpacity));
      const actual = ctx.getImageData(0, 0, width, height).data;
      let sum = 0; for (let i = 0; i < actual.length; i++) if (i % 4 !== 3) sum += Math.abs(actual[i] - pixels[i]);
      return { budget, actualStrokes: strokes.length, width, height, analysisMaxSize: budget > 200 ? 256 : 128, elapsedMs, mae: sum / (width * height * 3), image: canvas.toDataURL(), strokes, config: STROKE_CONFIG };
    }, budget);
    writeFileSync(join(out, `${budget}笔.png`), Buffer.from(result.image.split(',')[1], 'base64'));
    writeFileSync(join(out, `${budget}笔-序列.json`), JSON.stringify(result.strokes));
    const { image, strokes, ...metrics } = result;
    report.push(metrics);
    console.log(JSON.stringify(metrics));
  }
  const original = await page.evaluate(() => window.comparison.original);
  writeFileSync(join(out, '参考原图.png'), Buffer.from(original.split(',')[1], 'base64'));
  writeFileSync(join(out, '对比数据.json'), JSON.stringify(report, null, 2));
  const images = report.map(r => ({ ...r, src: `data:image/png;base64,${readFileSync(join(out, `${r.budget}笔.png`)).toString('base64')}` }));
  const html = `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>莫奈日出 · 六档笔触对比</title><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#f6f7fb;color:#17233f;font-family:Arial,"PingFang SC",sans-serif}header{display:flex;gap:32px;align-items:center;margin-bottom:24px}header img{width:360px;border-radius:14px}h1{font-size:32px;margin:0 0 16px}p{line-height:1.65;margin:8px 0}small{color:#536079}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{background:white;padding:12px;border:1px solid #d9ddea;border-radius:18px}article img{width:100%;display:block;border-radius:10px}h2{font-size:23px;margin:12px 4px 4px}img{cursor:zoom-in}dialog{border:0;background:#101827ee;color:white;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:20px}dialog img{display:block;width:100%;height:calc(100% - 60px);object-fit:contain;cursor:zoom-out}button{padding:10px 18px;border-radius:20px;border:1px solid #999;background:white;cursor:pointer}footer{margin-top:18px;color:#536079;font-size:14px}@media(max-width:800px){body{padding:16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}header{flex-direction:column;align-items:start}header img{max-width:100%}h1{font-size:25px}}</style><header><img src="${original}" alt="莫奈日出·印象参考原图"><div><h1>同一幅《日出·印象》，六档笔触效果</h1><p>每一档独立重新规划，全序列绘制完成；不是截取 1000 笔的前几笔。</p><p>当前程序算法 · 细节档 · 85% 笔触不透明度 · 白色画布，无原图垫底</p><small>左侧为参考原图。点击任意图片放大，再点图片或按 Esc 返回。<br>保留当前程序设置：100 / 200 笔分析尺寸 128；其余为 256，因此不是仅改变笔数的严格控制变量实验。</small></div></header><div class="grid">${images.map(r => `<article><img src="${r.src}" alt="${r.budget}笔最终效果"><h2>${r.budget} 笔</h2><small>实际 ${r.actualStrokes} 笔 · RGB 平均绝对误差 ${r.mae.toFixed(1)} / 255</small></article>`).join('')}</div><footer>参考与结果均以 ${report[0].width} × ${report[0].height} 输出。像素误差仅辅助观察还原程度，不代表审美评分或绘画学习效果。</footer><dialog><button onclick="this.parentElement.close()">关闭，返回对比</button><img alt="放大图片" onclick="this.parentElement.close()"></dialog><script>document.querySelectorAll('header img,article img').forEach(img=>img.onclick=()=>{const d=document.querySelector('dialog');d.querySelector('img').src=img.src;d.showModal()})</script></html>`;
  writeFileSync(join(out, '交互对比.html'), html);
  await page.setContent(html); await page.evaluate(() => Promise.all([...document.images].filter(i => i.src).map(i => i.decode())));
  await page.screenshot({ path: join(out, '六档效果总览.png'), fullPage: true });
  console.log(`Saved comparison: ${out}`);
} finally { await browser.close(); }
