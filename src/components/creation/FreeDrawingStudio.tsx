'use client';

import { useCallback, useState } from 'react';
import { Save, Brush, Palette, Undo2 } from 'lucide-react';
import PaintCanvas from '@/components/PaintCanvas';
import StudioWorkspace from './StudioWorkspace';
import ArtworkSave from './ArtworkSave';
import type { StrokeDrawData } from '@/lib/stroke-engine';
import { useStudioSession } from './StudioSession';

const EMPTY: StrokeDrawData[] = [];
type CanvasAPI = { commitUserToBase: () => void; getBaseCanvas: () => HTMLCanvasElement | null; saveUndoSnapshot: () => void; undo: () => void; clearAll: () => void };
function api(): CanvasAPI | undefined { return (window as unknown as { __paintCanvas?: CanvasAPI }).__paintCanvas; }

export default function FreeDrawingStudio({ onReset }: { onReset: () => void }) {
  const session = useStudioSession();
  const [color, setColor] = useState<[number, number, number]>([.1, .3, .7]);
  const [width, setWidth] = useState(6);
  const [saturation, setSaturation] = useState(1);
  const [value, setValue] = useState(1);
  const [eraser, setEraser] = useState(false);
  const [spray, setSpray] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [drawn, setDrawn] = useState(0);
  const commit = useCallback(() => { api()?.commitUserToBase(); session.markChanged(); setDrawn(n => n + 1); }, [session]);
  const begin = useCallback(() => { api()?.saveUndoSnapshot(); session.markChanged(); }, [session]);
  const getCanvas = useCallback(() => api()?.getBaseCanvas() ?? null, []);

  return <div className="free-studio"><StudioWorkspace onReset={onReset} state={eraser ? '橡皮擦' : spray ? '喷绘' : '自由绘画'} panels={[
    { id: 'brush', title: '画笔', icon: Brush, content: <section className="creation-card"><h2>画笔</h2>
      <label className="creation-label">粗细 · {Math.round(width)} px<input type="range" aria-label="画笔粗细" min={1} max={60} value={width} onChange={e => setWidth(Number(e.target.value))} /></label>
      <div className="creation-actions"><button aria-pressed={!eraser && !spray} onClick={() => { setEraser(false); setSpray(false); }}>画笔</button><button aria-pressed={spray} onClick={() => { setSpray(true); setEraser(false); }}>喷绘</button><button aria-pressed={eraser} onClick={() => { setEraser(true); setSpray(false); }}>橡皮擦</button></div>
    </section> },
    { id: 'color', title: '颜色', icon: Palette, content: <section className="creation-card"><h2>颜色</h2>
      <label className="creation-label">基础颜色<input type="color" aria-label="画笔颜色" value={'#' + color.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')} onChange={e => { const hex = e.target.value; setColor([parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255]); }} /></label>
      <label className="creation-label">饱和度<input aria-label="画笔饱和度" type="range" min={0} max={1} step={0.01} value={saturation} onChange={e => setSaturation(Number(e.target.value))} /></label>
      <label className="creation-label">明度<input aria-label="画笔明度" type="range" min={0} max={1} step={0.01} value={value} onChange={e => setValue(Number(e.target.value))} /></label>
    </section> },
    { id: 'history', title: '编辑', icon: Undo2, content: <section className="creation-card"><h2>编辑画布</h2><div className="creation-actions"><button disabled={!canUndo} onClick={() => { api()?.undo(); session.markChanged(); }}>撤销上一笔</button><button onClick={() => { api()?.clearAll(); session.markChanged(); setDrawn(0); }}>清空画布</button></div></section> },
    { id: 'save', title: '保存', icon: Save, content: <ArtworkSave getCanvas={getCanvas} mode="free" strokeCount={drawn} /> },
  ]}>
    <section className="creation-main">
    <div className="creation-canvas-heading"><h1>自由画布</h1><span className="creation-note">按自己的想法落笔</span></div>
    <div className="free-studio-stage"><PaintCanvas width={640} height={480} mode="free" strokes={EMPTY} currentGuideStroke={null} brushWidth={width} freeColor={color} freeSat={saturation} freeVal={value} masterStyle={null} eraserMode={eraser} sprayMode={spray} onUserStrokeDone={commit} onUserStrokeStart={begin} onUndoAvailable={setCanUndo} /></div>
    </section></StudioWorkspace>

  </div>;
}
