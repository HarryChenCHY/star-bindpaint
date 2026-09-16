'use client';

import { useState, type PointerEvent } from 'react';
import { BrushColor, brushColorCss, hsvToRgb, rgbToHsv } from '@/lib/brush-color';

export default function HsvColorPicker({ color, onChange }: { color: BrushColor; onChange: (color: BrushColor) => void }) {
  const [initialH, s, v] = rgbToHsv(...color);
  const [rememberedHue, setRememberedHue] = useState(initialH);
  const h = s === 0 || v === 0 ? rememberedHue : initialH;
  const update = (hue: number, saturation: number, brightness: number) => {
    setRememberedHue(hue);
    onChange(hsvToRgb(hue, saturation, brightness));
  };
  const pointer = (event: PointerEvent<HTMLDivElement>, wheel: boolean) => {
    if (event.type === 'pointermove' && !event.buttons) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const r = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width, y = (event.clientY - r.top) / r.height;
    if (wheel) update(((Math.atan2(y - .5, x - .5) / (2 * Math.PI)) + .25 + 1) % 1, s, v);
    else update(h, Math.max(0, Math.min(1, x)), 1 - Math.max(0, Math.min(1, y)));
  };
  return <div className="mt-3 border-t-2 border-[#ECEAFE] pt-3" data-testid="hsv-picker">
    <p className="mb-2 text-xs font-bold">自定义颜色 · 拖动色环与方框</p>
    <div className="relative mx-auto h-48 w-48 rounded-full" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', touchAction: 'none' }} onPointerDown={e => pointer(e, true)} onPointerMove={e => pointer(e, true)}>
      <div className="absolute inset-[18px] rounded-full bg-white" />
      <span className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_1px_#17233F]" style={{ left: `calc(${50 + Math.sin(h * Math.PI * 2) * 45}% - 8px)`, top: `calc(${50 - Math.cos(h * Math.PI * 2) * 45}% - 8px)` }} />
      <div role="group" aria-label="饱和度与明度选色方框" className="absolute left-[42px] top-[42px] h-[108px] w-[108px] border border-[#17233F]" style={{ background: `linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent), ${brushColorCss(hsvToRgb(h, 1, 1))}`, touchAction: 'none' }} onPointerDown={e => { e.stopPropagation(); pointer(e, false); }} onPointerMove={e => { e.stopPropagation(); pointer(e, false); }}>
        <span className="pointer-events-none absolute h-3 w-3 rounded-full border-2 border-white shadow-[0_0_0_1px_black]" style={{ left: `calc(${s * 100}% - 6px)`, top: `calc(${(1 - v) * 100}% - 6px)` }} />
      </div>
    </div>
    <div className="mt-3 grid grid-cols-3 gap-2">{[['H 色相', h * 360, 360], ['S 饱和度', s * 100, 100], ['V 明度', v * 100, 100]].map(([label, value, max], i) => <label key={label} className="text-[10px] font-bold">{label}<input aria-label={String(label)} type="number" min={0} max={max} value={Math.round(Number(value))} className="mt-1 w-full rounded-lg border p-1 text-sm" onChange={e => { const n = Math.max(0, Math.min(Number(max), Number(e.target.value))) / Number(max); update(i === 0 ? n : h, i === 1 ? n : s, i === 2 ? n : v); }} /></label>)}</div>
  </div>;
}
