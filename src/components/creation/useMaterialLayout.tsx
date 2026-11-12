'use client';

import { useEffect, useRef, useState, type CSSProperties, type RefObject, type PointerEvent } from 'react';
import { Copy, RotateCw, Trash2, Undo2, Redo2, Check } from 'lucide-react';
import { creativeMaterialSvg, surroundingColor, softenMaterialSvg, harmonizeMaterialSvg } from '@/lib/creative-material';
import { loadLocalImage, readCanvas, type Material } from '@/lib/co-create';
import { constrainMaterial, drawMaterial, layoutBounds, type MaterialInstance } from '@/lib/material-layout';
import { updateMaterialPreferences } from '@/lib/material-library';
import { transformMaterial, type MaterialGestureKind } from '@/lib/material-gestures';
import MaterialPreview from './MaterialPreview';
import { maskedMaterialSource, objectPoint, reorderMaterial, type MaskStroke } from '@/lib/material-editing';
import { useStudioSession } from './StudioSession';

export type MaterialPlacement = Pick<MaterialInstance,'id'|'x'|'y'|'width'|'height'|'rotation'|'variation'> & { materialId:string };
const placement = ({ id, material, x, y, width, height, rotation, variation }: MaterialInstance): MaterialPlacement => ({ id, materialId:material.id, x, y, width, height, rotation, variation });

type Snapshot = { items: MaterialInstance[]; selected: string | null };
type Gesture = { item: MaterialInstance; before: Snapshot; points: Map<number, { x: number; y: number }>; starts: { x: number; y: number }[]; kind: MaterialGestureKind };

export default function useMaterialLayout({ canvas, target, pause, onConfirm, initialPhoto, confirmationLabel }: {
  initialPhoto?: string | null;
  confirmationLabel?: string;
  canvas: RefObject<HTMLCanvasElement | null>;
  target: RefObject<HTMLCanvasElement | null>;
  pause: () => void;
  onConfirm: (bounds: ReturnType<typeof layoutBounds>, labels: string[], placements: MaterialPlacement[]) => void;
}) {
  const session = useStudioSession();
  const [layout, setLayout] = useState<Snapshot>({ items: [], selected: null });
  const live = useRef(layout);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(Boolean(initialPhoto));
  const committing = useRef(false);
  const mounted = useRef(true);
  const gesture = useRef<Gesture | null>(null);
  const rangeStart = useRef<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [brushMode, setBrushMode] = useState<'move' | 'erase' | 'restore'>('move');
  const [brushSize, setBrushSize] = useState(30);
  const painting = useRef<{ pointer: number; item: MaterialInstance; before: Snapshot; mark: MaskStroke } | null>(null);
  const tool = layout.selected ? brushMode : 'move';
  useEffect(() => {
    if (!initialPhoto) return;
    let cancelled = false;
    loadLocalImage(initialPhoto).then(image => {
      if (cancelled) return;
      const material: Material = { id: 'initial-photo', kind: 'uploaded', label: '照片', src: initialPhoto, ratio: image.naturalWidth / image.naturalHeight, color: '#fff' };
      const width = Math.min(640, 480 * material.ratio);
      const item = constrainMaterial({ id: crypto.randomUUID(), material, x: 320, y: 240, width, height: width / material.ratio, rotation: 0, variation: 0, harmonize: false, softEdges: false, src: initialPhoto });
      live.current = { items: [item], selected: item.id }; setLayout(live.current); setLoadingPhoto(false);
    }).catch(() => { if (!cancelled) { setError('照片读取失败，请返回重新选择。'); setLoadingPhoto(false); } });
    return () => { cancelled = true; };
  }, [initialPhoto]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const selected = layout.items.find(item => item.id === layout.selected);
  useEffect(() => { session.setPending(layout.items.length > 0); return () => session.setPending(false); }, [layout.items.length, session]);
  function replace(next: Snapshot) { live.current = next; setLayout(next); }
  function remember(before = live.current) { setPast(p => [...p.slice(-29), before]); setFuture([]); }
  function change(next: Snapshot) { if (committing.current) return; remember(); replace(next); setError(''); }
  function colorize(item: MaterialInstance) {
    if (item.material.kind === 'uploaded') return { ...item, src: item.material.src, harmonize: false, softEdges: false };
    const ambient = item.harmonize && target.current ? surroundingColor(readCanvas(target.current), item) : undefined;
    if (item.material.kind === 'library') {
      const svg = harmonizeMaterialSvg(item.material.svg!, ambient);
      return { ...item, src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.softEdges ? softenMaterialSvg(svg, .35) : svg)}` };
    }
    const svg = creativeMaterialSvg(item.material.id, item.variation, ambient);
    return { ...item, src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.softEdges ? softenMaterialSvg(svg) : svg)}` };
  }
  function add(material: Material, position?: { x: number; y: number }, variation = 0) {
    if (committing.current) return;
    pause(); setBrushMode('move');
    const offset = live.current.items.length % 6 * 18;
    const width = Math.min(160, 160 * material.ratio);
    const item = colorize(constrainMaterial({ id: crypto.randomUUID(), material, x: position?.x ?? 270 + offset, y: position?.y ?? 200 + offset, width, height: width / material.ratio, rotation: 0, variation, harmonize: true, softEdges: true, src: '' }));
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
  function remove(id = live.current.selected) {
    const items = live.current.items.filter(item => item.id !== id);
    change({ items, selected: items.at(-1)?.id ?? null });
  }
  function duplicate(id = live.current.selected) {
    if (committing.current || gesture.current) return;
    const source = live.current.items.find(item => item.id === id);
    if (!source) return;
    let item = constrainMaterial({ ...source, id: crypto.randomUUID(), x: source.x + 24, y: source.y + 24 });
    if (item.x === source.x && item.y === source.y) item = constrainMaterial({ ...item, x: source.x - 24, y: source.y - 24 });
    change({ items: [...live.current.items, item], selected: item.id });
  }
  function layer(direction: number) {
    if (!selected || gesture.current || painting.current) return;
    change({ ...live.current, items: reorderMaterial(live.current.items, selected.id, direction) });
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
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return { x: (e.clientX - rect.left) * 640 / rect.width, y: (e.clientY - rect.top) * 480 / rect.height };
  }
  function start(e: PointerEvent<HTMLDivElement>, item: MaterialInstance) {
    if ((e.pointerType !== 'touch' && e.button !== 0) || committing.current) return;
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-material-action]')?.dataset.materialAction as MaterialGestureKind | undefined;
    if (!action) return;
    if (tool !== 'move' && item.id === live.current.selected && action === 'move') {
      if (painting.current) return;
      const p = point(e); if (!p) return;
      e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); pause();
      painting.current = { pointer: e.pointerId, item, before: live.current, mark: { restore: tool === 'restore', size: brushSize / item.width * 1000, points: [objectPoint(item, p)] } };
      paint(e); return;
    }
    if (painting.current) return;
    if (item.id !== live.current.selected) setBrushMode('move');
    const previous = gesture.current;
    if (previous && (previous.item.id !== item.id || previous.points.size >= 2 || e.pointerType !== 'touch')) return;
    const p = point(e);
    if (!p) return;
    e.preventDefault(); e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 旧设备仍可处理元素内指针移动。 */ }
    if (previous) {
      previous.points.set(e.pointerId, p);
      previous.item = live.current.items.find(value => value.id === item.id)!;
      previous.starts = [...previous.points.values()];
    } else gesture.current = { item, before: live.current, points: new Map([[e.pointerId, p]]), starts: [p], kind: action };
    pause();
    replace({ ...live.current, selected: item.id });
  }
  function paint(e: PointerEvent) {
    const active = painting.current;
    if (!active || active.pointer !== e.pointerId) return;
    const p = point(e); if (!p) return;
    active.mark.points.push(objectPoint(active.item, p));
    const item = { ...active.item, mask: [...(active.item.mask ?? []), { ...active.mark, points: [...active.mark.points] }] };
    replace({ ...live.current, items: live.current.items.map(value => value.id === item.id ? item : value) });
  }
  function move(e: PointerEvent) {
    if (painting.current) { e.preventDefault(); paint(e); return; }
    const g = gesture.current;
    if (!g?.points.has(e.pointerId)) return;
    const p = point(e);
    if (!p) return;
    e.preventDefault();
    g.points.set(e.pointerId, p);
    const next = transformMaterial(g.item, g.starts, [...g.points.values()], g.kind);
    replace({ ...live.current, items: live.current.items.map(item => item.id === next.id ? next : item) });
  }
  function finish(e: PointerEvent, cancelled = false) {
    const active = painting.current;
    if (active?.pointer === e.pointerId) {
      if (cancelled) replace(active.before); else { paint(e); remember(active.before); }
      painting.current = null; return;
    }
    const g = gesture.current;
    if (!g?.points.has(e.pointerId)) return;
    if (cancelled) { gesture.current = null; replace(g.before); return; }
    move(e);
    g.points.delete(e.pointerId);
    if (g.points.size) {
      g.item = live.current.items.find(item => item.id === g.item.id)!;
      g.starts = [...g.points.values()]; g.kind = 'move';
      return;
    }
    gesture.current = null;
    const next = live.current.items.find(item => item.id === g.item.id)!;
    const original = g.before.items.find(item => item.id === next.id)!;
    if (next.x !== original.x || next.y !== original.y || next.width !== original.width || next.rotation !== original.rotation) {
      remember(g.before);
      replace({ ...live.current, items: live.current.items.map(item => item.id === next.id ? colorize(next) : item) });
    }
  }
  async function confirm() {
    if (!live.current.items.length || committing.current || gesture.current || painting.current || !target.current) return;
    committing.current = true; setBusy(true); setError('');
    const items = live.current.items;
    try {
      const images = await Promise.all(items.map(item => loadLocalImage(maskedMaterialSource(item))));
      if (!mounted.current || !target.current) return;
      // Stage the entire batch first: a failed image must not partially commit the layout.
      const staged = document.createElement('canvas'); staged.width = 640; staged.height = 480;
      const ctx = staged.getContext('2d')!;
      ctx.drawImage(target.current, 0, 0);
      items.forEach((item, index) => drawMaterial(ctx, images[index], item));
      target.current.getContext('2d')!.drawImage(staged, 0, 0);
      session.markChanged();
      replace({ items: [], selected: null }); setPast([]); setFuture([]);
      onConfirm(layoutBounds(items), items.map(item => `${item.material.label}${item.variation ? ` · ${item.variation + 1}` : ''}`), items.map(placement));
    } catch { if (mounted.current) setError('素材暂时无法确认，布局已保留，请重试。'); }
    finally { committing.current = false; if (mounted.current) setBusy(false); }
  }

  const overlay = <div className="material-layout" aria-label="待确认素材布局">{layout.items.map((item, index) => <div
    key={item.id} className="material-instance" data-brush={tool} data-selected={item.id === layout.selected} data-testid="material-preview"
    style={{ zIndex: index + 1, left: `${item.x / 640 * 100}%`, top: `${item.y / 480 * 100}%`, width: `${item.width / 640 * 100}%`, height: `${item.height / 480 * 100}%`, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}
    onPointerDown={e => start(e, item)} onPointerMove={move} onPointerUp={e => finish(e)} onPointerCancel={e => finish(e, true)} onLostPointerCapture={e => { if (e.target === e.currentTarget) finish(e, true); }} onContextMenu={e => e.preventDefault()}>
    <button className="material-move" data-material-action="move" disabled={busy} aria-label={`选择并移动${item.material.label} ${index + 1}`} aria-pressed={item.id === layout.selected}
      onFocus={() => { if (!committing.current) replace({ ...live.current, selected: item.id }); }}
      onKeyDown={e => {
        const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (delta[e.key]) { e.preventDefault(); const [dx, dy] = delta[e.key]; edit({ x: item.x + dx * (e.shiftKey ? 10 : 2), y: item.y + dy * (e.shiftKey ? 10 : 2) }); }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
      }}><MaterialPreview item={item} /></button>
    {item.id === layout.selected && tool === 'move' && <>
      {['sw', 'se'].map(corner => <button key={corner} className={`material-handle material-${corner}`} data-material-action="scale" disabled={busy} aria-label={`缩放${item.material.label} ${corner}`} onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); edit({ width: item.width + (e.key === 'ArrowUp' ? 10 : -10) }); } }} />)}
      <button type="button" className="material-handle material-duplicate" disabled={busy} aria-label={`复制${item.material.label} ${index + 1}`} title="复制素材" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); duplicate(item.id); }}><Copy size={14} /></button>
      <button className="material-handle material-delete" disabled={busy} aria-label={`删除${item.material.label} ${index + 1}`} title="删除素材" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); remove(item.id); }}><Trash2 size={14} /></button>
      <button className="material-handle material-rotate" data-material-action="rotate" disabled={busy} aria-label="旋转选中素材" onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); edit({ rotation: item.rotation + (e.key === 'ArrowRight' ? 5 : -5) }); } }}><RotateCw size={14} /></button>
    </>}
  </div>)}</div>;

  const contextual = selected && <div className="material-context-bar" aria-label="选中对象操作">
    <button disabled={busy || layout.items.at(-1)?.id === selected.id} onClick={() => layer(1)}>前移一层</button>
    <button disabled={busy || layout.items[0]?.id === selected.id} onClick={() => layer(-1)}>后移一层</button>
  </div>;
  const brushControls = <div className="creation-card brush-settings">
    <div className="brush-size-control" role="group" aria-label="笔刷大小">
      <span className="brush-size-heading">笔刷大小</span>
      <output className="brush-size-value"><span>{brushSize}</span><small>px</small></output>
      <span className="brush-slider" data-disabled={!selected || busy} style={{ '--brush-fraction': (brushSize - 4) / 116, '--brush-fill': `${(brushSize - 4) / 116 * 100}%` } as CSSProperties}>
        <span className="brush-slider-track" aria-hidden="true" /><span className="brush-slider-thumb" aria-hidden="true" />
        <input aria-label={tool === 'restore' ? '恢复画笔大小' : '擦除画笔大小'} aria-valuetext={`${brushSize} 像素`} disabled={!selected || busy} type="range" min={4} max={120} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} />
      </span>
    </div>
    <p className="brush-scope-note">{!selected ? '请先选中对象' : tool === 'restore' ? '恢复已擦除部分' : '仅擦除选中对象'}</p>
  </div>;
  const controls = <div className="material-controls">
    <div className="creation-actions"><button disabled={busy || !past.length} onClick={undo}><Undo2 size={15} />撤销布局</button><button disabled={busy || !future.length} onClick={redo}><Redo2 size={15} />重做</button></div>
    {layout.items.length > 0 && <><p className="creation-note">待确认 {layout.items.length} 个</p><details className="studio-control-help"><summary>编排提示</summary><p className="creation-note">单指拖动，双指缩放和旋转；下方角柄缩放、圆柄旋转，左上角复制、右上角删除。</p></details>
      <div className="material-list" aria-label="待确认素材">{layout.items.map((item, index) => <button key={item.id} title={item.material.label} disabled={busy} aria-pressed={item.id === layout.selected} onClick={() => replace({ ...live.current, selected: item.id })}>{index + 1}. {item.material.label}</button>)}</div>
      {selected && <fieldset disabled={busy} className="material-properties"><legend title={`${selected.material.label} · 调整`}>{selected.material.label} · 调整</legend>
        <label className="creation-label studio-range-control"><span>素材大小</span><output>{Math.round(selected.width)}</output><input aria-label="素材大小" type="range" min={40} max={640} value={selected.width} onPointerDown={e => { rangeStart.current = live.current; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={finishRange} onPointerCancel={finishRange} onBlur={finishRange} onChange={e => edit({ width: Number(e.target.value) })} /></label>
        <label className="creation-label studio-range-control"><span>旋转角度</span><output>{Math.round(selected.rotation)}°</output><input aria-label="素材旋转角度" type="range" min={-180} max={180} value={selected.rotation} onPointerDown={e => { rangeStart.current = live.current; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={finishRange} onPointerCancel={finishRange} onBlur={finishRange} onChange={e => edit({ rotation: Number(e.target.value) })} /></label>
        <div className="creation-actions"><button disabled={layout.items.at(-1)?.id === selected.id} onClick={() => layer(1)}>前移一层</button><button disabled={layout.items[0]?.id === selected.id} onClick={() => layer(-1)}>后移一层</button><button onClick={() => duplicate()}><Copy size={15} />复制</button><button onClick={() => remove()}><Trash2 size={15} />删除</button>{!selected.material.kind && <button onClick={() => edit({ variation: selected.variation + 1 })}>换个样子</button>}</div>
        {selected.material.kind !== 'uploaded' ? <>
        <label className="material-blend" title="协调周围配色"><input type="checkbox" checked={selected.harmonize} onChange={e => edit({ harmonize: e.target.checked })} />协调配色</label>
        <label className="material-blend"><input type="checkbox" checked={Boolean(selected.softEdges)} onChange={e => edit({ softEdges: e.target.checked })} />柔和衔接</label>
        <p className="creation-note">只柔化边缘，保留中心与主要形状。关闭可恢复清晰边缘。</p></> : <p className="creation-note">上传素材保留原图颜色与透明背景，确认后由笔触画出。</p>}
      </fieldset>}
      <div className="creation-actions"><button className="creation-primary" aria-label={busy ? '正在确认…' : confirmationLabel ?? `确认 ${layout.items.length} 个并续绘`} disabled={busy} onClick={() => void confirm()}><Check size={16} /><span className="studio-wide-label">{busy ? '正在确认…' : confirmationLabel ?? `确认 ${layout.items.length} 个并续绘`}</span><span className="studio-compact-label">{busy ? '确认中…' : confirmationLabel ?? '确认续绘'}</span></button><button disabled={busy} onClick={() => change({ items: [], selected: null })}>清空预览</button></div>
      <details className="studio-control-help"><summary>确认说明</summary><p className="creation-note">{confirmationLabel ? '确认后的布局会保留为手绘参考。' : '仅预览布局可撤销。确认后由笔触画出，本阶段尚不支持撤销已确认内容。保存作品不包含预览素材。'}</p></details>
    </>}
    {error && <p role="alert" className="creation-error">{error}</p>}
  </div>;
  return { tool, add, overlay, controls, contextual, brushControls, snapshot: () => live.current.items.map(placement),
    restore: (items: { placement:MaterialPlacement; material:Material }[]) => {
      const restored=items.map(({ placement: saved, material }) => colorize(constrainMaterial({ ...saved, material, src:'', harmonize:true, softEdges:true })));
      replace({ items:restored,selected:restored.at(-1)?.id ?? null });
    },
    preview: async () => {
      const base=target.current, items=live.current.items.slice(0,60);
      if (!base || !items.length) return undefined;
      const staged=document.createElement('canvas'); staged.width=640; staged.height=480;
      const ctx=staged.getContext('2d')!;
      ctx.drawImage(base,0,0);
      const images=await Promise.all(items.map(item=>loadLocalImage(maskedMaterialSource(item))));
      items.forEach((item,index)=>drawMaterial(ctx,images[index],item));
      return staged.toDataURL('image/jpeg',.82);
    }, setBrushMode, selected: Boolean(selected), deselect: () => { if (!gesture.current && !painting.current) replace({ ...live.current, selected: null }); }, count: layout.items.length, confirm, error, pending: layout.items.length > 0, busy: busy || loadingPhoto };
}
