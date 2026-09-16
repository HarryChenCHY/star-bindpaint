'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Upload } from 'lucide-react';

const lines = [
  { d: 'M70 220L300 220', color: '#69D2C2', width: 54, x: 300, y: 220 },
  { d: 'M180 215L180 120', color: '#4F8C68', width: 12, x: 180, y: 120 },
  { d: 'M180 175L140 150', color: '#4F8C68', width: 15, x: 140, y: 150 },
  ...Array.from({ length: 8 }, (_, i) => {
    const a = i * Math.PI / 4;
    return { d: `M${180 + Math.cos(a) * 20} ${105 + Math.sin(a) * 20}L${180 + Math.cos(a) * 48} ${105 + Math.sin(a) * 48}`, color: '#FFD166', width: 23, x: 180 + Math.cos(a) * 48, y: 105 + Math.sin(a) * 48 };
  }),
  { d: 'M177 105L183 105', color: '#805333', width: 36, x: 183, y: 105 },
];

export default function HomePaintingDemo() {
  const svg = useRef<SVGSVGElement>(null);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setTick(t => (t + 1) % 24), 650);
    return () => clearInterval(id);
  }, [paused]);
  useEffect(() => {
    if (paused) svg.current?.pauseAnimations();
    else svg.current?.unpauseAnimations();
  }, [paused, tick]);
  const stage = tick < 4 ? 0 : tick < 8 ? 1 : 2;
  const count = Math.min(lines.length, Math.max(0, tick - 7));
  return <div className="rounded-[2rem] border-2 border-[#17233F] bg-white p-4 shadow-[8px_8px_0_#6558D9]" data-testid="home-painting-demo">
    <div className="flex items-center justify-between gap-2 pb-3"><div><p className="text-xs font-bold text-[#6558D9]">从一张图片，到亲手完成</p><p className="mt-1 font-black">{['① 上传想画的图片', '② 转为有序笔触', '③ 跟着轨迹，一笔一笔画'][stage]}</p></div><button onClick={() => setPaused(p => !p)} aria-label={paused ? '播放流程演示' : '暂停流程演示'} className="rounded-full border-2 p-2">{paused ? <Play size={18} /> : <Pause size={18} />}</button></div>
    <svg ref={svg} viewBox="0 0 360 290" className="w-full rounded-2xl border-2 border-[#17233F] bg-[#FFF9E8]" role="img" aria-label="上传、笔触拆解、画笔沿轨迹绘画的循环示意">
      {stage === 0 && <g opacity=".8">{lines.map((l, i) => <path key={i} d={l.d} stroke={l.color} strokeWidth={l.width} strokeLinecap="round" />)}</g>}
      {stage > 0 && lines.map((l, i) => <g key={`${stage}-${i}`}><path d={l.d} stroke={stage === 1 || i >= (tick < 20 ? count - 1 : count) ? '#6558D9' : l.color} strokeWidth={stage === 1 || i >= (tick < 20 ? count - 1 : count) ? 2 : l.width} strokeDasharray={stage === 1 || i >= (tick < 20 ? count - 1 : count) ? '5 6' : undefined} strokeLinecap="round" opacity={stage === 1 || i >= (tick < 20 ? count - 1 : count) ? .35 : 1} />{stage === 1 && <text x={l.x} y={l.y} fontSize="12" fill="#17233F">{i + 1}</text>}</g>)}
      {stage === 2 && count > 0 && count <= lines.length && tick < 20 && <g key={count}><path d={lines[count - 1].d} fill="none" stroke={lines[count - 1].color} strokeWidth={lines[count - 1].width} strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur=".6s" fill="freeze" /></path><g><animateMotion path={lines[count - 1].d} dur=".6s" fill="freeze" /><path d="M0 0L8 -23L17 -18L0 0Z" fill="#17233F" stroke="white" strokeWidth="2" /></g></g>}
      {stage === 0 && <g transform="translate(275 24)"><rect width="60" height="48" rx="12" fill="#FFD166" /><foreignObject x="18" y="12" width="24" height="24"><Upload size={24} /></foreignObject></g>}
    </svg>
    <div className="mt-3 grid grid-cols-3 gap-2">{['上传图片', '笔触序列', '跟随绘画'].map((s, i) => <button key={s} onClick={() => setTick([0, 4, 8][i])} aria-pressed={stage === i} className="rounded-xl p-3 text-xs font-bold" style={{ background: stage === i ? '#FFD166' : '#ECEAFE' }}>{s}</button>)}</div>
    <p className="mt-3 text-xs text-[#536079]">流程示意 · 选好自己的图片，就能开始。</p>
  </div>;
}
