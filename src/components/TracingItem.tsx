'use client';

/* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability, react-hooks/preserve-manual-memoization */
/* eslint-disable @next/next/no-img-element */

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Maximize2 } from 'lucide-react';

export interface TracingRef {
  id: string;
  src: string;
  x: number; y: number;
  width: number; height: number;
  visible: boolean;
  locked: boolean;
}

interface TracingItemProps {
  tracing: TracingRef;
  containerWidth: number;
  containerHeight: number;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
}

export default function TracingItem({
  tracing, containerWidth, containerHeight, onMove, onResize,
}: TracingItemProps) {
  const dragRef = useRef({ sx: 0, sy: 0, cx: 0, cy: 0, active: false });
  const elRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary || tracing.locked) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    e.preventDefault();
    dragRef.current = { sx: tracing.x, sy: tracing.y, cx: e.clientX, cy: e.clientY, active: true };
    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
  }, [tracing.x, tracing.y, tracing.locked, containerWidth, containerHeight, onMove]);

  const handleWindowMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current.active) return;
    const d = dragRef.current;
    const el = elRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    onMove(d.sx + (e.clientX - d.cx) * containerWidth / rect.width,
           d.sy + (e.clientY - d.cy) * containerHeight / rect.height);
  }, [containerWidth, containerHeight, onMove]);

  const handleWindowUp = useCallback(() => {
    dragRef.current.active = false;
    window.removeEventListener('pointermove', handleWindowMove);
    window.removeEventListener('pointerup', handleWindowUp);
  }, [handleWindowMove]);

  const startResize = useCallback((e: React.PointerEvent) => {
    if (tracing.locked) return;
    e.stopPropagation(); e.preventDefault();
    const sw = tracing.width, sh = tracing.height, sx = e.clientX;
    const hm = (ev: PointerEvent) => {
      const s = Math.max(30, sw + (ev.clientX - sx));
      onResize(Math.round(s), Math.round(s * sh / sw));
    };
    const hu = () => { window.removeEventListener('pointermove', hm); window.removeEventListener('pointerup', hu); };
    window.addEventListener('pointermove', hm);
    window.addEventListener('pointerup', hu);
  }, [tracing, onResize]);

  return (
    <div
      ref={elRef}
      className="absolute"
      style={{
        left: `${(tracing.x / containerWidth) * 100}%`,
        top: `${(tracing.y / containerHeight) * 100}%`,
        width: `${(tracing.width / containerWidth) * 100}%`,
        height: `${(tracing.height / containerWidth) * 100}%`,
        transform: 'translate(-50%, -50%)',
        opacity: tracing.visible ? 1 : 0,
        pointerEvents: tracing.locked ? 'none' : 'auto',
      }}
      onPointerDown={handlePointerDown}
    >
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ width: '100%', height: '100%', position: 'relative' }}>
        <img src={tracing.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.3, pointerEvents: 'none' }} draggable={false} />
        {!tracing.locked && (
          <>
            <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ border: '2px dashed #F9B801' }} />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#F9B801', border: '2px solid #FFFFFF', boxShadow: '0 0 0 2px #F9B801', cursor: 'se-resize' }}
              onPointerDown={startResize}>
              <Maximize2 size={10} strokeWidth={3} color="#1A1A1A" />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
