'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type RefObject, type PointerEvent } from 'react';
import { Copy, RotateCw, Trash2, Undo2, Redo2, Check } from 'lucide-react';
import { creativeMaterialSvg, surroundingColor, softenMaterialSvg } from '@/lib/creative-material';
import { loadLocalImage, readCanvas, type Material } from '@/lib/co-create';
import { constrainMaterial, drawMaterial, layoutBounds, type MaterialInstance } from '@/lib/material-layout';
import { updateMaterialPreferences } from '@/lib/material-library';

type Snapshot = { items: MaterialInstance[]; selected: string | null };
type Gesture = { pointer: number; item: MaterialInstance; before: Snapshot; startX: number; startY: number; kind: 'move' | 'scale' | 'rotate' };

export default function useMaterialLayout({ canvas, target, pause, onConfirm }: {
  canvas: RefObject<HTMLCanvasElement | null>;
  target: RefObject<HTMLCanvasElement | null>;
  pause: () => void;
  onConfirm: (bounds: ReturnType<typeof layoutBounds>, labels: string[]) => void;
}) {
  const [layout, setLayout] = useState<Snapshot>({ items: [], selected: null });
  const live = useRef(layout);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const committing = useRef(false);
  const mounted = useRef(true);
  const gesture = useRef<Gesture | null>(null);
  const rangeStart = useRef<Snapshot | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const selected = layout.items.find(item => item.id === layout.selected);
  function replace(next: Snapshot) { live.current = next; setLayout(next); }
  function remember(before = live.current) { setPast(p => [...p.slice(-29), before]); setFuture([]); }
  function change(next: Snapshot) { if (committing.current) return; remember(); replace(next); setError(''); }
  function colorize(item: MaterialInstance) {
    const ambient = item.harmonize && target.current ? surroundingColor(readCanvas(target.current), item) : undefined;
    const svg = creativeMaterialSvg(item.material.id, item.variation, ambient);
    return { ...item, src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.softEdges ? softenMaterialSvg(svg) : svg)}` };
  }
  function add(material: Material, position?: { x: number; y: number }, variation = 0) {
    if (committing.current) return;
    pause();
    const offset = live.current.items.length % 6 * 18;
    const item = colorize(constrainMaterial({ id: crypto.randomUUID(), material, x: position?.x ?? 270 + offset, y: position?.y ?? 200 + offset, width: 160, height: 160 / material.ratio, rotation: 0, variation, harmonize: true, softEdges: true, src: '' }));
    change({ items: [...live.current.items, item], selected: item.id });
    updateMaterialPreferences('use', `${material.id}:${variation}`);
  }
  function edit(patch: Partial<MaterialInstance>) {
    if (!selected) return;
    const next = colorize(constrainMaterial({ ...selected, ...patch }));
    const updated = { ...live.current, items: live.current.items.map(item => item.id === next.id ? next : item) };
    if (rangeStart.current) replace(updated); else change(updated);
  }
  function finishRange() {
    if (!rangeStart.current) return;
    if (rangeStart.current !== live.current) remember(rangeStart.current);
    rangeStart.current = null;
  }
  function remove() {
    const items = live.current.items.filter(item => item.id !== live.current.selected);
    change({ items, selected: items.at(-1)?.id ?? null });
  }
  function duplicate() {
    if (!selected) return;
    const item = colorize(constrainMaterial({ ...selected, id: crypto.randomUUID(), x: selected.x + 24, y: selected.y + 24 }));
    change({ items: [...live.current.items, item], selected: item.id });
  }
  function undo() {
    if (committing.current || !past.length) return;
    pause();
    setFuture(f => [...f, live.current]); replace(past[past.length - 1]); setPast(p => p.slice(0, -1));
  }
  function redo() {
    if (committing.current || !future.length) return;
    pause();
    setPast(p => [...p, live.current]); replace(future[future.length - 1]); setFuture(f => f.slice(0, -1));
  }
  function point(e: PointerEvent) {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * 640 / rect.width, y: (e.clientY - rect.top) * 480 / rect.height };
  }
  function start(e: PointerEvent<HTMLDivElement | HTMLButtonElement>, item: MaterialInstance, kind: Gesture['kind']) {
    if (!e.isPrimary || e.button !== 0 || committing.current || gesture.current) return;
    e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    gesture.current = { pointer: e.pointerId, item, before: live.current, startX: p.x, startY: p.y, kind };
    replace({ ...live.current, selected: item.id });
  }
  function move(e: PointerEvent) {
    const g = gesture.current;
    if (!g || g.pointer !== e.pointerId) return;
    const p = point(e);
    let next = { ...g.item };
    if (g.kind === 'move') next = { ...next, x: next.x + p.x - g.startX, y: next.y + p.y - g.startY };
    if (g.kind === 'scale') next.width *= Math.hypot(p.x - next.x, p.y - next.y) / Math.max(1, Math.hypot(g.startX - next.x, g.startY - next.y));
    if (g.kind === 'rotate') next.rotation += (Math.atan2(p.y - next.y, p.x - next.x) - Math.atan2(g.startY - next.y, g.startX - next.x)) * 180 / Math.PI;
    next = constrainMaterial(next);
    replace({ ...live.current, items: live.current.items.map(item => item.id === next.id ? next : item) });
  }
  function finish(e: PointerEvent, cancelled = false) {
    const g = gesture.current;
    if (!g || g.pointer !== e.pointerId) return;
    gesture.current = null;
    if (cancelled) { replace(g.before); return; }
    const next = live.current.items.find(item => item.id === g.item.id)!;
    if (next.x !== g.item.x || next.y !== g.item.y || next.width !== g.item.width || next.rotation !== g.item.rotation) {
      remember(g.before);
      replace({ ...live.current, items: live.current.items.map(item => item.id === next.id ? colorize(next) : item) });
    }
  }
  async function confirm() {
    if (!live.current.items.length || committing.current || gesture.current || !target.current) return;
    committing.current = true; setBusy(true); setError('');
    const items = live.current.items;
    try {
      const images = await Promise.all(items.map(item => loadLocalImage(item.src)));
      if (!mounted.current || !target.current) return;
      // Stage the entire batch first: a failed image must not partially commit the layout.
      const staged = document.createElement('canvas'); staged.width = 640; staged.height = 480;
      const ctx = staged.getContext('2d')!;
      ctx.drawImage(target.current, 0, 0);
      items.forEach((item, index) => drawMaterial(ctx, images[index], item));
      target.current.getContext('2d')!.drawImage(staged, 0, 0);
      replace({ items: [], selected: null }); setPast([]); setFuture([]);
      onConfirm(layoutBounds(items), items.map(item => `${item.material.label}${item.variation ? ` · ${item.variation + 1}` : ''}`));
    } catch { if (mounted.current) setError('素材暂时无法确认，布局已保留，请重试。'); }
    finally { committing.current = false; if (mounted.current) setBusy(false); }
  }

  const overlay = <div className="material-layout" aria-label="待确认素材布局">{layout.items.map((item, index) => <div
    key={item.id} className="material-instance" data-selected={item.id === layout.selected} data-testid="material-preview"
    style={{ left: `${item.x / 640 * 100}%`, top: `${item.y / 480 * 100}%`, width: `${item.width / 640 * 100}%`, height: `${item.height / 480 * 100}%`, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}>
    <button className="material-move" disabled={busy} aria-label={`选择并移动${item.material.label} ${index + 1}`} aria-pressed={item.id === layout.selected}
      onFocus={() => { if (!committing.current) replace({ ...live.current, selected: item.id }); }}
      onPointerDown={e => start(e, item, 'move')} onPointerMove={move} onPointerUp={e => finish(e)} onPointerCancel={e => finish(e, true)} onLostPointerCapture={e => finish(e, true)}
      onKeyDown={e => {
        const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (delta[e.key]) { e.preventDefault(); const [dx, dy] = delta[e.key]; edit({ x: item.x + dx * (e.shiftKey ? 10 : 2), y: item.y + dy * (e.shiftKey ? 10 : 2) }); }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
      }}><img src={item.src} alt="" draggable={false} /></button>
    {item.id === layout.selected && <>
      {['nw', 'ne', 'sw', 'se'].map(corner => <button key={corner} className={`material-handle material-${corner}`} disabled={busy} aria-label={`缩放${item.material.label} ${corner}`} onPointerDown={e => start(e, item, 'scale')} onPointerMove={move} onPointerUp={e => finish(e)} onPointerCancel={e => finish(e, true)} onLostPointerCapture={e => finish(e, true)} onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); edit({ width: item.width + (e.key === 'ArrowUp' ? 10 : -10) }); } }} />)}
      <button className="material-handle material-rotate" disabled={busy} aria-label="旋转选中素材" onPointerDown={e => start(e, item, 'rotate')} onPointerMove={move} onPointerUp={e => finish(e)} onPointerCancel={e => finish(e, true)} onLostPointerCapture={e => finish(e, true)} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); edit({ rotation: item.rotation + (e.key === 'ArrowRight' ? 5 : -5) }); } }}><RotateCw size={14} /></button>
    </>}
  </div>)}</div>;

  const controls = <div className="material-controls">
    <div className="creation-actions"><button disabled={busy || !past.length} onClick={undo}><Undo2 size={15} />撤销布局</button><button disabled={busy || !future.length} onClick={redo}><Redo2 size={15} />重做</button></div>
    {layout.items.length > 0 && <><p className="creation-note">待确认 {layout.items.length} 个 · 可继续点选素材添加。拖动方框移动，四角缩放，上方圆柄旋转。</p>
      <div className="material-list" aria-label="待确认素材">{layout.items.map((item, index) => <button key={item.id} disabled={busy} aria-pressed={item.id === layout.selected} onClick={() => replace({ ...live.current, selected: item.id })}>{index + 1}. {item.material.label}</button>)}</div>
      {selected && <fieldset disabled={busy} className="material-properties"><legend>{selected.material.label} · 调整</legend>
        <label className="creation-label">素材大小<input aria-label="素材大小" type="range" min={40} max={640} value={selected.width} onPointerDown={e => { rangeStart.current = live.current; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={finishRange} onPointerCancel={finishRange} onBlur={finishRange} onChange={e => edit({ width: Number(e.target.value) })} /></label>
        <label className="creation-label">旋转角度 · {Math.round(selected.rotation)}°<input aria-label="素材旋转角度" type="range" min={-180} max={180} value={selected.rotation} onPointerDown={e => { rangeStart.current = live.current; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={finishRange} onPointerCancel={finishRange} onBlur={finishRange} onChange={e => edit({ rotation: Number(e.target.value) })} /></label>
        <div className="creation-actions"><button onClick={duplicate}><Copy size={15} />复制</button><button onClick={remove}><Trash2 size={15} />删除</button><button onClick={() => edit({ variation: selected.variation + 1 })}>换个样子</button></div>
        <label className="material-blend"><input type="checkbox" checked={selected.harmonize} onChange={e => edit({ harmonize: e.target.checked })} />协调周围配色</label>
        <label className="material-blend"><input type="checkbox" checked={Boolean(selected.softEdges)} onChange={e => edit({ softEdges: e.target.checked })} />柔和衔接</label>
        <p className="creation-note">只柔化边缘，保留中心与主要形状。关闭可恢复清晰边缘。</p>
      </fieldset>}
      <div className="creation-actions"><button className="creation-primary" disabled={busy} onClick={() => void confirm()}><Check size={16} />{busy ? '正在确认…' : `确认 ${layout.items.length} 个并续绘`}</button><button disabled={busy} onClick={() => change({ items: [], selected: null })}>清空预览</button></div>
      <p className="creation-note">仅预览布局可撤销。确认后由笔触画出，本阶段尚不支持撤销已确认内容。保存作品不包含预览素材。</p>
    </>}
    {error && <p role="alert" className="creation-error">{error}</p>}
  </div>;
  return { add, overlay, controls, confirm, error, pending: layout.items.length > 0, busy };
}
