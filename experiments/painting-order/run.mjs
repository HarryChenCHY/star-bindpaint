import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const out = join(process.cwd(), '论文/笔触顺序探索_不接入正式程序');
mkdirSync(out, { recursive: true });
const bundle = await build({ stdin: { contents: "export { planBudgetStrokes } from './experiments/painting-order/baseline-planner'; export { planOrderedStrokes } from './experiments/painting-order/ordered-planner'; export { imageSourceFromImage, drawStroke } from './src/lib/stroke-engine';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'Lab' });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(async url => {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = 768; c.height = Math.round(768 * img.naturalHeight / img.naturalWidth);
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, c.width, c.height);
    window.lab = { source: Lab.imageSourceFromImage(img), width: c.width, height: c.height, original: c.toDataURL(), pixels: ctx.getImageData(0, 0, c.width, c.height).data, results: [] };
  }, `data:image/jpeg;base64,${readFileSync('public/masterworks/monet/impression_sunrise.jpg').toString('base64')}`);
  const variants = [
    ['baseline', '当前算法', '全画面残差优先，位置可跨区域跳跃'],
    ['sorted', '对照：直接重排', '按笔宽档、网格顺序重排旧笔触，不重新拟合颜色'],
    ['raster', '方案 A：五遍扫描', '大→中→小五个笔宽层，每层按网格从左上到右下访问'],
    ['regions', '方案 B：铺底后局部雕琢', '先两遍铺底，再在手工指定的五个区域内分别由粗到细'],
  ];
  const results = [];
  for (const [id, title, description] of variants) {
    const result = await page.evaluate(async ({ id, title, description }) => {
      const { source, width, height, pixels } = window.lab;
      const start = performance.now();
      const center = s => ({ x: (s.points[0].x + s.points.at(-1).x) / 2, y: (s.points[0].y + s.points.at(-1).y) / 2 });
      let strokes, centers = [];
      if (id === 'baseline') strokes = await Lab.planBudgetStrokes(source, width, height, 1000, 1, .85);
      else if (id === 'sorted') {
        const bin = s => Math.floor(Math.log2(s.width));
        const cell = s => { const c = center(s); return Math.floor(c.y / height * 6) * 6 + Math.floor(c.x / width * 6); };
        strokes = [...window.lab.results[0].strokes].sort((a, b) => bin(b) - bin(a) || cell(a) - cell(b));
      } else ({ strokes, centers } = await Lab.planOrderedStrokes(source, width, height, 1000, 1, .85, undefined, id));
      const elapsedMs = Math.round(performance.now() - start);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height);
      const checkpoints = [];
      for (let i = 0; i < strokes.length; i++) {
        Lab.drawStroke(ctx, strokes[i], .85);
        if ([100, 180, 400, 700, 1000].includes(i + 1) || i === strokes.length - 1) checkpoints.push({ count: i + 1, image: canvas.toDataURL() });
      }
      const rendered = ctx.getImageData(0, 0, width, height).data;
      let mae = 0; for (let i = 0; i < rendered.length; i++) if (i % 4 !== 3) mae += Math.abs(rendered[i] - pixels[i]);
      mae /= width * height * 3;
      let jump = 0, largeJumps = 0, widthIncreases = 0;
      for (let i = 1; i < strokes.length; i++) {
        const a = center(strokes[i - 1]), b = center(strokes[i]);
        const distance = Math.hypot(a.x - b.x, a.y - b.y) / Math.hypot(width, height);
        jump += distance; if (distance > .3) largeJumps++;
        if (strokes[i].width > strokes[i - 1].width * 1.1) widthIncreases++;
      }
      const result = { id, title, description, strokes, centers, count: strokes.length, elapsedMs, mae, meanCenterJump: jump / (strokes.length - 1), largeJumps, widthIncreases, image: canvas.toDataURL(), checkpoints };
      window.lab.results.push(result); return result;
    }, { id, title, description });
    results.push(result);
    const { strokes, centers, image, checkpoints, ...stats } = result;
    writeFileSync(join(out, `${id}-序列.json`), JSON.stringify({ strokes, centers }));
    writeFileSync(join(out, `${id}-最终.png`), Buffer.from(image.split(',')[1], 'base64'));
    for (const cp of checkpoints) writeFileSync(join(out, `${id}-${cp.count}笔.png`), Buffer.from(cp.image.split(',')[1], 'base64'));
    console.log(JSON.stringify(stats));
  }
  const { original, width, height } = await page.evaluate(() => ({ original: window.lab.original, width: window.lab.width, height: window.lab.height }));
  writeFileSync(join(out, '参考原图.png'), Buffer.from(original.split(',')[1], 'base64'));
  const metrics = results.map(({ strokes, centers, image, checkpoints, ...stats }) => stats);
  writeFileSync(join(out, '实验数据.json'), JSON.stringify({ image: 'public/masterworks/monet/impression_sunrise.jpg', imageSha256: createHash('sha256').update(readFileSync('public/masterworks/monet/impression_sunrise.jpg')).digest('hex'), productionPlannerSha256: createHash('sha256').update(readFileSync('experiments/painting-order/baseline-planner.ts')).digest('hex'), budget: 1000, analysisSize: 256, inputSize: 512, width, height, opacity: .85, semanticRegions: 'manual concept-test masks, not automatic object recognition', metrics }, null, 2));
  const css = `*{box-sizing:border-box}body{margin:0;padding:24px;background:#f6f7fb;color:#17233f;font:16px Arial,"PingFang SC",sans-serif}header{display:flex;gap:24px;align-items:center;margin-bottom:20px}header img{width:260px;border-radius:12px}h1{font-size:28px}p{line-height:1.6}small{color:#536079}button{border:1px solid #17233f;border-radius:12px;padding:10px 18px;background:#FFD166;cursor:pointer}input[type=range]{width:min(600px,80vw)}.controls{position:sticky;top:0;z-index:2;background:#f6f7bf;padding:12px;border-radius:12px;margin-bottom:20px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}article{padding:14px;background:white;border:1px solid #ddd;border-radius:18px}canvas{width:100%;display:block}h2{font-size:20px;margin:0 0 8px}.phase{font-size:13px;color:#6558d9;min-height:22px}.stats{font-size:13px;line-height:1.8;margin-top:8px}footer{font-size:13px;line-height:1.7;margin-top:18px}@media(max-width:700px){.grid{grid-template-columns:1fr}header{flex-direction:column;align-items:start}}`;
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>笔触顺序实验</title><style>${css}</style><header><img src="${original}" alt="日出原图"><div><h1>同一幅画 · 四种绘制顺序</h1><p>独立实验，不接入正式画板。统一 1000 笔预算、256 分析尺寸、85% 不透明度、白色画布。</p><small>B 的区域是为这幅画手工划定的概念验证；不是自动识别的结果。<br>拖动进度，比较铺底、推进与最终画面；勾选连线观察跨区域跳跃。</small></div></header><div class="controls"><button id="play">播放过程</button> <label>进度 <input id="step" type="range" min="0" max="1000" value="1000"></label> <strong id="value">1000</strong> <label><input id="trail" type="checkbox">最近 12 笔位置连线</label></div><div class="grid">${results.map(r => `<article><h2>${r.title}</h2><small>${r.description}</small><p class="phase" id="phase-${r.id}"></p><canvas id="${r.id}" width="${width}" height="${height}"></canvas><div class="stats">实际 ${r.count} 笔 / 1000 预算 · RGB MAE ${r.mae.toFixed(2)}<br>平均跳距 ${(r.meanCenterJump * 100).toFixed(1)}% 对角线 · 大跳跃 ${r.largeJumps} 次 · 笔宽回增 ${r.widthIncreases} 次</div></article>`).join('')}</div><footer>大跳跃：相邻笔触中心距离大于画布对角线的 30%；笔宽回增：后一笔比前一笔宽超过 10%。这些是顺序描述指标，不是易用性或美感证据。MAE 越小仅说明平均像素更接近。B 在切换区域时允许重新从较粗笔画起。</footer><script>const data=${JSON.stringify(results.map(({ id, strokes, centers }) => ({ id, strokes, centers })))};const step=document.getElementById('step'), trail=document.getElementById('trail');let timer;function render(){const n=Number(step.value);document.getElementById('value').textContent=n;for(const r of data){const c=document.getElementById(r.id),x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);for(const s of r.strokes.slice(0,n)){x.strokeStyle='rgba('+s.color.map(v=>Math.round(v*255)).join(',')+',0.85)';x.lineWidth=Math.max(1,s.width);x.lineCap='round';x.beginPath();x.moveTo(s.points[0].x,s.points[0].y);s.points.slice(1).forEach(p=>x.lineTo(p.x,p.y));x.stroke()}if(trail.checked){x.lineWidth=2;x.strokeStyle='#f302c9';x.setLineDash([4,4]);x.beginPath();r.strokes.slice(Math.max(0,n-12),n).forEach((s,i)=>{const a=s.points[0],b=s.points.at(-1),px=(a.x+b.x)/2,py=(a.y+b.y)/2;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();x.setLineDash([])}document.getElementById('phase-'+r.id).textContent=n===0?'白纸开始':r.centers[Math.min(n,r.strokes.length)-1]?.label||'当前笔 '+Math.min(n,r.strokes.length)}}step.oninput=render;trail.onchange=render;document.getElementById('play').onclick=()=>{if(timer){clearInterval(timer);timer=null;document.getElementById('play').textContent='播放过程';return}if(+step.value>=1000)step.value=0;document.getElementById('play').textContent='暂停';timer=setInterval(()=>{step.value=Math.min(1000,+step.value+10);render();if(+step.value>=1000){clearInterval(timer);timer=null;document.getElementById('play').textContent='播放过程'}},150)};render();</script></html>`;
  writeFileSync(join(out, '交互过程对比.html'), html);
  await page.setContent(html); await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
  await page.screenshot({ path: join(out, '四方案最终效果.png'), fullPage: true });
  await page.setViewportSize({ width: 1600, height: 450 });
  for (const r of results) {
    await page.setContent(`<html><meta charset="utf-8"><style>${css}.grid{grid-template-columns:repeat(5,minmax(0,1fr))}img{width:100%}h1{margin-bottom:12px}</style><h1>${r.title} · 过程快照</h1><p>${r.description} · 每张为累计绘制结果</p><div class="grid">${r.checkpoints.map(cp => `<article><h2>${cp.count} 笔</h2><img src="${cp.image}"></article>`).join('')}</div></html>`);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    await page.screenshot({ path: join(out, `${r.id}-过程.png`), fullPage: true });
  }
  console.log(out);
} finally { await browser.close(); }
