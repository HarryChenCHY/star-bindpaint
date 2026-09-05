'use client';

/* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability, react-hooks/preserve-manual-memoization */
/* eslint-disable @next/next/no-img-element */

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Maximize2, X } from 'lucide-react';

export interface PlacedSticker {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StickerItemProps {
  sticker: PlacedSticker;
  containerWidth: number;
  containerHeight: number;
  onFix: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
}

export default function StickerItem({
  sticker,
  containerWidth,
  containerHeight,
  onFix,
  onDelete,
  onMove,
  onResize,
}: StickerItemProps) {
  const dragRef = useRef({ sx: 0, sy: 0, cx: 0, cy: 0, active: false });
  const elRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 只响应主指针，且在贴纸图片区域拖拽
    if (!e.isPrimary) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return; // 不拦截按钮点击
    e.preventDefault();
    dragRef.current = { sx: sticker.x, sy: sticker.y, cx: e.clientX, cy: e.clientY, active: true };
    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
  }, [sticker.x, sticker.y, containerWidth, containerHeight, onMove]);

  const handleWindowMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current.active) return;
    const d = dragRef.current;
    const el = elRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const scaleX = containerWidth / rect.width;
    const scaleY = containerHeight / rect.height;
    onMove(sticker.id,
      d.sx + (e.clientX - d.cx) * scaleX,
      d.sy + (e.clientY - d.cy) * scaleY
    );
  }, [sticker.id, containerWidth, containerHeight, onMove]);

  const handleWindowUp = useCallback(() => {
    dragRef.current.active = false;
    window.removeEventListener('pointermove', handleWindowMove);
    window.removeEventListener('pointerup', handleWindowUp);
  }, [handleWindowMove]);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const sw = sticker.width, sh = sticker.height;
    const sx = e.clientX;
    const hm = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const s = Math.max(30, sw + dx);
      onResize(sticker.id, Math.round(s), Math.round(s * sh / sw));
    };
    const hu = () => {
      window.removeEventListener('pointermove', hm);
      window.removeEventListener('pointerup', hu);
    };
    window.addEventListener('pointermove', hm);
    window.addEventListener('pointerup', hu);
  }, [sticker, onResize]);

  return (
    <div
      ref={elRef}
      className="absolute"
      style={{
        left: `${(sticker.x / containerWidth) * 100}%`,
        top: `${(sticker.y / containerHeight) * 100}%`,
        width: `${(sticker.width / containerWidth) * 100}%`,
        height: `${(sticker.height / containerHeight) * 100}%`,
        transform: 'translate(-50%, -50%)',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
      onPointerDown={handlePointerDown}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        <img
          src={sticker.src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          draggable={false}
        />
        <div className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ border: '2px dashed #7A51EC' }} />
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: '#7A51EC', border: '2px solid #FFFFFF', boxShadow: '0 0 0 2px #7A51EC', cursor: 'se-resize' }}
          onPointerDown={startResize}
        >
          <Maximize2 size={10} strokeWidth={3} color="#FFFFFF" />
        </div>
      </motion.div>

      {/* 工具栏 — 放在贴纸下方 */}
      <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex gap-1">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onFix(sticker.id)}
          className="rounded-full w-7 h-7 flex items-center justify-center"
          style={{ background: '#7DC353', border: '2px solid #1A1A1A', boxShadow: '2px 2px 0 #1A1A1A' }}
          title="贴好"
          aria-label="贴好"
        >
          <Check size={16} strokeWidth={3.2} color="#FFFFFF" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(sticker.id)}
          className="rounded-full w-7 h-7 flex items-center justify-center"
          style={{ background: '#F302C9', border: '2px solid #1A1A1A', boxShadow: '2px 2px 0 #1A1A1A' }}
          title="不要"
          aria-label="不要"
        >
          <X size={16} strokeWidth={3.2} color="#FFFFFF" />
        </motion.button>
      </div>
    </div>
  );
}
