'use client';
import { viewportGesture, viewportPoint } from '@/lib/canvas-viewport';
import { useRef, useState, type ReactNode, type PointerEvent } from 'react';
export default function CanvasViewport({ children, onDeselect, onNavigationChange }: { children: ReactNode; onDeselect: () => void; onNavigationChange: (active: boolean) => void }) {
  const [viewMode, setViewMode] = useState(false);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const live = useRef(view);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const baseline = useRef({ view, center: { x: 0, y: 0 }, distance: 1 });
  const fitArea = useRef<HTMLDivElement>(null);
  function update(next: typeof view) { live.current = next; setView(next); }
  function local(e: PointerEvent) { return viewportPoint(fitArea.current!.getBoundingClientRect(), { x: e.clientX, y: e.clientY }); }
  function sample() { const p = [...points.current.values()]; return { center: { x: p.reduce((s,v)=>s+v.x,0)/p.length, y: p.reduce((s,v)=>s+v.y,0)/p.length }, distance: p.length > 1 ? Math.max(1,Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)) : 1 }; }
  function rebase() { if(points.current.size) baseline.current = { view: live.current, ...sample() }; }
  function start(e: PointerEvent<HTMLDivElement>) {
    if (!viewMode || points.current.size >= 2 || e.button > 0) return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); points.current.set(e.pointerId,local(e)); rebase();
  }
  function move(e: PointerEvent) {
    if (!points.current.has(e.pointerId)) return;
    points.current.set(e.pointerId,local(e)); const now=sample(), b=baseline.current;
    update(viewportGesture(b.view, b.center, now.center, now.distance / b.distance));
  }
  function finish(e: PointerEvent) { points.current.delete(e.pointerId); rebase(); }
  return <><div className="canvas-view-controls" aria-label="画布视区">
    <button aria-pressed={viewMode} onClick={() => { setViewMode(!viewMode); onNavigationChange(!viewMode); points.current.clear(); }}> {viewMode ? '返回素材编辑' : '移动画布'}</button>
    <button aria-label="缩小视区" disabled={view.scale <= 1} onClick={() => update({ ...view, scale: Math.max(1,view.scale-.25) })}>−</button><output>{Math.round(view.scale*100)}%</output>
    <button aria-label="放大视区" disabled={view.scale >= 4} onClick={() => update({ ...view, scale: Math.min(4,view.scale+.25) })}>＋</button><button onClick={() => update({ x:0,y:0,scale:1 })}>适合画布</button>
  </div><div className="canvas-viewport" data-navigation={viewMode} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onClick={e => { if (!viewMode && !(e.target as HTMLElement).closest('.material-instance')) onDeselect(); }}>
    <div ref={fitArea} className="canvas-fit-area"><div className="canvas-view-transform" style={{ transform:`translate(${view.x}px,${view.y}px) scale(${view.scale})` }}>{children}</div></div>
  </div></>;
}
