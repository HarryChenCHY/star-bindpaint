'use client';
import { useEffect, useRef, useState } from 'react';
import { MASTER_STYLES, stylizeStroke, drawStylizedStroke } from '@/lib/style-transfer';
import { preparePlan } from '@/lib/study/client';
import type { StrokePlan } from '@/lib/study/protocol';

const STYLE_NOTES = [
  ['柔和短笔', '两端收细、分段处理路径，叠加小幅色相变化。', '适合轻扫色彩、尝试草地或水面。'],
  ['鼓起厚涂', '笔宽在中段增大，双层描画形成厚涂感，主色跟随颜色预览。', '适合有力度的线条和密集排笔；旋转方向由你的手势决定。'],
  ['鲜艳平涂', '接近等宽的笔刷、较小的边缘扰动与较高不透明度，保持选定颜色。', '适合铺设大块颜色和清晰的色彩分区。'],
  ['压感干笔', '宽度随压力变化，保留选定主色，渲染时随机略过约 15% 的线段。', '适合有留白的肌理。鼠标采用基础压力，压感笔可增加提按变化。'],
  ['断续笔迹', '近似等宽、分段处理与轻微色相变化；周期性留出笔迹间隙。', '适合碎片化线条和色彩实验；不会自动重构物体的几何形状。'],
  ['轻盈渐细', '两端收细、低边缘扰动，形成轻盈的笔形。', '适合流畅勾画与收细笔迹；不是物理水彩扩散模拟。'],
];
function StyleCanvas({ index }: { index: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const points = Array.from({ length: 90 }, (_, i) => ({ x: 16 + i * 3, y: 62 + Math.sin(i / 17) * 23 }));
    drawStylizedStroke(ctx, stylizeStroke(points, points.map((_, i) => .3 + .6 * Math.sin(i / 90 * Math.PI)), [.2, .48, .65], MASTER_STYLES[index], 15));
  }, [index]);
  return <canvas ref={ref} width={310} height={125} className="w-full rounded-xl bg-[#F6F7FB]" role="img" aria-label={`${MASTER_STYLES[index].name}风格的实际引擎笔触示例`} />;
}
export function StyleExplorer() {
  const [selected, setSelected] = useState(0);
  const style = MASTER_STYLES[selected], notes = STYLE_NOTES[selected];
  return <>
    <div className="intro-grid three" role="group" aria-label="六种大师笔触">
      {MASTER_STYLES.map((s, i) => <button key={s.id} onClick={() => setSelected(i)} aria-pressed={i === selected} className={`intro-style ${i === selected ? 'selected' : ''}`}>
        <span className="flex items-center justify-between gap-2"><strong>{s.name}</strong><span className="text-xs text-[#536079]">{STYLE_NOTES[i][0]}</span></span>
        <StyleCanvas index={i} />
      </button>)}
    </div>
    <div className="intro-callout mt-5" aria-live="polite">
      <h3>{style.name} · {notes[0]}</h3><p>{notes[1]}</p><p>{notes[2]}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold"><span className="intro-pill">不透明度 {Math.round(style.opacity * 100)}%</span><span className="intro-pill">色相扰动 ±{style.colorJitter}°</span><span className="intro-pill">边缘扰动 {style.roughness}</span><span className="intro-pill">纹理 {style.texture}</span></div>
    </div>
    <p className="intro-caption">六条示例使用同一条输入路径、同一基础颜色和笔宽，由自由画板的实际渲染函数绘制。主色与预览共用调色函数，色相扰动不超过 ±2°，不透明度统一为 96%。随机肌理每次可能略有不同；这是本地程序化笔刷，不需要调用大模型。</p>
  </>;
}

export function BudgetExplorer() {
  const source = useRef<HTMLCanvasElement>(null), output = useRef<HTMLCanvasElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [plan, setPlan] = useState<StrokePlan | null>(null), [count, setCount] = useState(0);
  const [status, setStatus] = useState('点击运行，查看当前算法如何逐笔重建这张示例图。'), [busy, setBusy] = useState(false);
  useEffect(() => {
    const ctx = source.current!.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#FFD166'; ctx.beginPath(); ctx.arc(96, 28, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#69D2C2'; ctx.fillRect(8, 94, 112, 24);
    ctx.fillStyle = '#6558D9'; ctx.fillRect(32, 55, 45, 39);
    ctx.fillStyle = '#17233F'; ctx.beginPath(); ctx.moveTo(26, 55); ctx.lineTo(54, 28); ctx.lineTo(83, 55); ctx.fill();
    ctx.fillStyle = '#FFD166'; ctx.fillRect(47, 69, 15, 25);
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    const ctx = output.current!.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 128, 128);
    if (!plan) return;
    for (const s of plan.strokes.slice(0, count)) {
      ctx.beginPath(); ctx.lineWidth = s.width; ctx.strokeStyle = s.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      s.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    }
  }, [plan, count]);
  async function run() {
    const abort = new AbortController(); controller.current = abort; setBusy(true);
    try {
      const result = await preparePlan(source.current!.toDataURL(), abort.signal, p => setStatus(`计算 ${Math.round(p.completed / p.total * 100)}% · 已接受 ${p.strokes} 笔`));
      setPlan(result.plan); setCount(result.plan.strokes.length); setStatus('计算完成。拖动下方滑块，观察完整序列中的任意进度。');
    } catch (e) { setStatus(e instanceof Error ? e.message : '计算失败，请重试'); } finally { setBusy(false); }
  }
  return <div className="intro-demo">
    <div className="intro-grid two"><figure><canvas ref={source} width={128} height={128} aria-label="笔触算法演示参考图" role="img" /><figcaption>目标图 · 合成示例</figcaption></figure><figure><canvas ref={output} width={128} height={128} aria-label="笔触算法实际重建结果" role="img" /><figcaption>虚拟画布 · {count} / {plan?.strokes.length ?? '待生成'} 笔</figcaption></figure></div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button className="intro-action" disabled={busy} onClick={() => void run()}>{busy ? '正在规划…' : plan ? '重新运行算法' : '运行笔触演示'}</button>{busy && <button className="intro-action" onClick={() => controller.current?.abort()}>取消计算</button>}<p role="status">{status}</p></div>
    {plan && <label className="mt-5 block font-bold">预览笔数：{count}<input className="mt-3 w-full accent-[#6558D9]" type="range" min={0} max={plan.strokes.length} value={count} onChange={e => setCount(Number(e.target.value))} /></label>}
    <p className="intro-caption">此处使用研究画板的不透明笔刷与真实规划 Worker；展示算法重建结果，未生成参与者记录。上限 1000 笔，实际接受的笔数可能更少。</p>
  </div>;
}

export function ExperimentExplorer() {
  const [condition, setCondition] = useState<'control' | 'guided'>('control');
  return <div className="intro-demo">
    <div className="flex flex-wrap gap-3" role="group" aria-label="对比实验条件示意">
      <button className="intro-action" aria-pressed={condition === 'control'} onClick={() => setCondition('control')}>A · 看图绘画</button><button className="intro-action" aria-pressed={condition === 'guided'} onClick={() => setCondition('guided')}>B · 笔触引导</button>
    </div>
    <div className="intro-grid two mt-6"><svg viewBox="0 0 320 180" className="w-full rounded-2xl bg-white" role="img" aria-label={condition === 'guided' ? '参考图和带起点箭头的引导画布示意' : '参考图和无引导的空白画布示意'}>
      <rect x="12" y="20" width="120" height="140" rx="12" fill="#ECEAFE" /><path d="M42 115 L102 115 L91 149 L53 149Z" fill="#FFD166" /><path d="M72 115 V52 M72 87 Q28 30 72 67 M72 78 Q120 22 72 54" fill="#69D2C2" stroke="#17233F" strokeWidth="3" /><rect x="163" y="20" width="144" height="140" rx="12" fill="white" stroke="#17233F" strokeWidth="2" />
      {condition === 'guided' && <g><path d="M197 130 Q240 70 279 58" fill="none" stroke="#6558D9" strokeWidth="5" strokeDasharray="6 5" /><circle cx="197" cy="130" r="7" fill="#FFD166" stroke="#17233F" strokeWidth="2" /><path d="M267 53 L282 57 L276 72" fill="none" stroke="#6558D9" strokeWidth="4" /></g>}
    </svg><div aria-live="polite"><h3>{condition === 'control' ? '自主决定画在哪里、画什么' : '按同一套计划接收逐笔提示'}</h3><p>{condition === 'control' ? '看到相同的参考图，用共同画布的画笔、橡皮擦、撤销重做与图层完成作品。没有笔触路径提示。' : '在相同工具上增加当前笔触的路径、方向、颜色、宽度与推进操作。保留用户真实落笔。'}</p><p className="mt-3 font-bold">两条件均关闭自动代画和理想笔迹替换，每轮最多 12 分钟。</p></div></div>
    <p className="intro-caption">交互示意，用于解释条件差异，不是实验测量结果。</p>
  </div>;
}
