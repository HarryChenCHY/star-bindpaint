'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { GripHorizontal, LockKeyhole, UnlockKeyhole, Minus, Moon } from 'lucide-react';

const STORAGE = 'startrace-companion-position-v1';
type Point = { x: number; y: number };
function save(point: Point | null, lock: boolean) {
  try { localStorage.setItem(STORAGE, JSON.stringify({ position: point, locked: lock })); } catch { /* 存储不可用仍可拖动。 */ }
}
export default function FloatingCompanion({ collapsed, onCollapse, children }: {
  collapsed: boolean; onCollapse: (value: boolean) => void; children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Point | null>(null);
  const [locked, setLocked] = useState(true);
  const positionRef = useRef<Point | null>(null);
  const lockedRef = useRef(true);
  const grab = useRef<{ id: number; x: number; y: number; origin: Point } | null>(null);
  const moved = useRef(false);
  const place = useCallback((point: Point, persist = false) => {
    const rect = panel.current?.getBoundingClientRect();
    const next = {
      x: Math.max(8, Math.min(point.x, window.innerWidth - (rect?.width ?? 248) - 8)),
      y: Math.max(72, Math.min(point.y, window.innerHeight - (rect?.height ?? 52) - 128)),
    };
    const old = positionRef.current;
    positionRef.current = next;
    if (!old || old.x !== next.x || old.y !== next.y) setPosition(next);
    if (persist) save(next, lockedRef.current);
  }, []);
  useEffect(() => {
    const restore = () => {
      let point = { x: window.innerWidth - (panel.current?.offsetWidth ?? 248) - 14, y: 80 };
      try {
        const value = JSON.parse(localStorage.getItem(STORAGE) || 'null');
        if (value?.position && Number.isFinite(value.position.x) && Number.isFinite(value.position.y)) point = value.position;
        if (typeof value?.locked === 'boolean') { lockedRef.current = value.locked; setLocked(value.locked); }
      } catch { /* 忽略失效偏好。 */ }
      place(point);
    };
    const frame = requestAnimationFrame(restore);
    const resize = () => { if (positionRef.current) place(positionRef.current); };
    const observer = new ResizeObserver(resize);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', resize); };
  }, [place]);
  function start(e: PointerEvent<HTMLButtonElement>) {
    moved.current = false;
    if (lockedRef.current || e.button !== 0) return;
    const rect = panel.current!.getBoundingClientRect();
    grab.current = { id: e.pointerId, x: e.clientX, y: e.clientY, origin: { x: rect.x, y: rect.y } };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (Math.hypot(dx, dy) > 4) moved.current = true;
    if (moved.current) place({ x: g.origin.x + dx, y: g.origin.y + dy });
  }
  function stop() { grab.current = null; save(positionRef.current, lockedRef.current); }
  const dragProps = { onPointerDown: start, onPointerMove: move, onPointerUp: stop, onPointerCancel: stop };
  return <div ref={panel} data-testid="floating-companion" className="fixed z-30 overflow-y-auto rounded-[1.3rem] border-2 border-[#17233F] bg-white shadow-[5px_5px_0_#6558D9]" style={{
    ...(position ? { left: position.x, top: position.y } : { right: 14, top: 80 }),
    width: collapsed ? 56 : 'clamp(210px, 28vw, 258px)', maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100dvh - 208px)',
  }}>
    {collapsed ? <button {...dragProps} onClick={e => { if (e.detail === 0 || !moved.current) onCollapse(false); }} aria-label="展开月亮伙伴" title={locked ? '展开月亮伙伴（位置已锁定）' : '点击展开，拖动移动'} className="flex h-[52px] w-[52px] touch-none items-center justify-center rounded-[1.2rem] bg-[#FFD166]">
      <Moon size={26} strokeWidth={2.5} />
    </button> : <>
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-[#D9DDEA] bg-white px-2 py-1.5">
        <button {...dragProps} aria-label="移动月亮伙伴" aria-disabled={locked} title={locked ? '先解锁，再拖动' : '拖动移动，也可用方向键微调'} className="flex min-h-9 flex-1 touch-none items-center gap-1 rounded-lg px-1 text-[11px] font-bold text-[#536079]" style={{ cursor: locked ? 'default' : 'grab' }}
          onKeyDown={e => {
            if (lockedRef.current || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault(); const p = positionRef.current!;
            place({ x: p.x + (e.key === 'ArrowLeft' ? -10 : e.key === 'ArrowRight' ? 10 : 0), y: p.y + (e.key === 'ArrowUp' ? -10 : e.key === 'ArrowDown' ? 10 : 0) }, true);
          }}><GripHorizontal size={17} />{locked ? '位置已锁定' : '拖动移动'}</button>
        <button aria-label={locked ? '解锁月亮伙伴位置' : '锁定月亮伙伴位置'} title={locked ? '解锁位置' : '锁定位置'} aria-pressed={locked} onClick={() => { lockedRef.current = !locked; setLocked(!locked); save(positionRef.current, !locked); }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECEAFE] text-[#6558D9]">{locked ? <LockKeyhole size={16} /> : <UnlockKeyhole size={16} />}</button>
        <button aria-label="收起月亮伙伴" title="收起为图标" onClick={() => onCollapse(true)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F6F7FB]"><Minus size={18} /></button>
      </div>
      <div className="space-y-3 p-3">{children}</div>
    </>}
  </div>;
}
