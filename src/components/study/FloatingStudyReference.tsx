'use client';
/* eslint-disable @next/next/no-img-element */

import { GripHorizontal, Minus, Plus, PanelTopClose, PanelTopOpen } from 'lucide-react';
import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';

export default function FloatingStudyReference({ src, title }: { src: string; title: string }) {
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<number>();
  const [collapsed, setCollapsed] = useState(false);

  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !panel.current) return;
    const rect = panel.current.getBoundingClientRect();
    const parent = panel.current.parentElement!.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointer: event.pointerId,
      x: rect.left - parent.left,
      y: rect.top - parent.top,
      offsetX: event.clientX,
      offsetY: event.clientY,
    };
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const anchor = drag.current;
    if (anchor?.pointer !== event.pointerId) return;
    setPosition({ x: anchor.x + event.clientX - anchor.offsetX, y: anchor.y + event.clientY - anchor.offsetY });
  }

  function resize(delta: number) {
    const width = panel.current?.getBoundingClientRect().width ?? 220;
    const available = panel.current?.parentElement?.clientWidth ?? 640;
    setSize(Math.max(126, Math.min(460, available - 16, width + delta)));
  }

  const style = {
    ...(size ? { '--reference-requested-width': `${size}px` } : {}),
    ...(position ? { '--reference-x': `${position.x}px`, '--reference-y': `${position.y}px` } : {}),
  } as CSSProperties;

  return <aside ref={panel} className="study-reference-float" data-positioned={Boolean(position)} data-collapsed={collapsed} style={style} aria-label={title}>
    <div className="study-reference-bar">
      <button type="button" className="study-reference-grip" aria-label="移动参考图，可使用方向键" onPointerDown={start} onPointerMove={move}
        onLostPointerCapture={() => { drag.current = null; }} onKeyDown={event => {
          const directions: Record<string, [number, number]> = { ArrowUp:[0,-16], ArrowDown:[0,16], ArrowLeft:[-16,0], ArrowRight:[16,0] };
          const delta = directions[event.key];
          if (!delta || !panel.current) return;
          event.preventDefault();
          const rect = panel.current.getBoundingClientRect();
          const parent = panel.current.parentElement!.getBoundingClientRect();
          setPosition({ x: rect.left - parent.left + delta[0], y: rect.top - parent.top + delta[1] });
        }}><GripHorizontal size={14} /><span>{title}</span></button>
      <button type="button" aria-label={collapsed ? '展开参考图' : '收起参考图'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>
        {collapsed ? <PanelTopOpen size={15} /> : <PanelTopClose size={15} />}
      </button>
    </div>
    {!collapsed && <>
      <img src={src} alt={title} draggable={false} />
      <div className="study-reference-sizing" aria-label="调整参考图大小">
        <button type="button" aria-label="缩小参考图" onClick={() => resize(-36)}><Minus size={16} /></button>
        <button type="button" aria-label="放大参考图" onClick={() => resize(36)}><Plus size={16} /></button>
      </div>
    </>}
  </aside>;
}
