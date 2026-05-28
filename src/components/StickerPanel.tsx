'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brush, X } from 'lucide-react';

export interface StickerDef {
  id: string;
  src: string;
  label: string;
  emoji: string;
}

const COMMON_STICKERS: StickerDef[] = [
  { id: 'sun', src: '/stickers/sun.svg', label: '太阳', emoji: '☀️' },
  { id: 'cloud', src: '/stickers/cloud.svg', label: '云朵', emoji: '☁️' },
  { id: 'flower', src: '/stickers/flower.svg', label: '小花', emoji: '🌼' },
  { id: 'heart', src: '/stickers/heart.svg', label: '爱心', emoji: '❤️' },
];

const THEME_STICKERS: Record<string, StickerDef[]> = {
  weather: [
    { id: 'rainbow', src: '/stickers/rainbow.svg', label: '彩虹', emoji: '🌈' },
    { id: 'raindrop', src: '/stickers/raindrop.svg', label: '雨滴', emoji: '🌧️' },
    { id: 'snowflake', src: '/stickers/snowflake.svg', label: '雪花', emoji: '❄️' },
  ],
  mood: [
    { id: 'smile', src: '/stickers/smile.svg', label: '笑脸', emoji: '😊' },
    { id: 'tear', src: '/stickers/tear.svg', label: '泪滴', emoji: '💧' },
    { id: 'star', src: '/stickers/star.svg', label: '星星', emoji: '⭐' },
  ],
  safe_place: [
    { id: 'house', src: '/stickers/house.svg', label: '房子', emoji: '🏠' },
    { id: 'tree', src: '/stickers/tree.svg', label: '大树', emoji: '🌳' },
    { id: 'bird', src: '/stickers/bird.svg', label: '小鸟', emoji: '🐦' },
  ],
  slow_line: [
    { id: 'butterfly', src: '/stickers/butterfly.svg', label: '蝴蝶', emoji: '🦋' },
    { id: 'spiral', src: '/stickers/spiral.svg', label: '螺旋', emoji: '🌀' },
    { id: 'sparkle', src: '/stickers/sparkle.svg', label: '星光', emoji: '✨' },
  ],
  planet: [
    { id: 'sun', src: '/stickers/sun.svg', label: '恒星', emoji: '☀️' },
    { id: 'ring', src: '/stickers/ring.svg', label: '光环', emoji: '🪐' },
    { id: 'rocket', src: '/stickers/rocket.svg', label: '火箭', emoji: '🚀' },
  ],
  kitty: [
    { id: 'catface', src: '/stickers/catface.svg', label: '猫脸', emoji: '🐱' },
    { id: 'fishbone', src: '/stickers/fishbone.svg', label: '鱼骨', emoji: '🐟' },
    { id: 'yarn', src: '/stickers/yarn.svg', label: '毛线球', emoji: '🧶' },
  ],
  bunny: [
    { id: 'bunnyear', src: '/stickers/bunnyear.svg', label: '兔耳', emoji: '🐰' },
    { id: 'carrot', src: '/stickers/carrot.svg', label: '胡萝卜', emoji: '🥕' },
    { id: 'grass', src: '/stickers/grass.svg', label: '草叶', emoji: '🌿' },
  ],
  fish: [
    { id: 'fish', src: '/stickers/fish.svg', label: '小鱼', emoji: '🐟' },
    { id: 'bubble', src: '/stickers/bubble.svg', label: '气泡', emoji: '🫧' },
    { id: 'shell', src: '/stickers/shell.svg', label: '贝壳', emoji: '🐚' },
  ],
};

interface StickerPanelProps {
  mode: 'sticker' | 'tracing';
  themeId?: string;
  tracingItems?: { src: string; label: string }[];
  tracingLocked?: boolean;
  tracingVisible?: boolean;
  hasTracing?: boolean; // 是否有正在使用的参考图
  onSelectSticker?: (sticker: StickerDef) => void;
  onSelectTracing?: (src: string) => void;
  onToggleLock?: () => void;
  onToggleVisible?: () => void;
  onDeleteTracing?: () => void;
  onClearAllTracing?: () => void;
  onSwitchToBrush: () => void;
  onClose: () => void;
}

export default function StickerPanel({
  mode, themeId, tracingItems,
  tracingLocked, tracingVisible, hasTracing,
  onSelectSticker, onSelectTracing,
  onToggleLock, onToggleVisible, onDeleteTracing, onClearAllTracing,
  onSwitchToBrush, onClose,
}: StickerPanelProps) {
  const allStickers = [...COMMON_STICKERS, ...(THEME_STICKERS[themeId || ''] || [])];

  const THEME_TRACING: Record<string, { src: string; label: string }[]> = {
    weather: [
      { src: '/tracing/sun.svg', label: '太阳' },
      { src: '/tracing/house.svg', label: '房子' },
      { src: '/tracing/tree.svg', label: '大树' },
    ],
    mood: [
      { src: '/tracing/star.svg', label: '星星' },
      { src: '/tracing/butterfly.svg', label: '蝴蝶' },
      { src: '/tracing/fish.svg', label: '小鱼' },
    ],
    safe_place: [
      { src: '/tracing/house.svg', label: '房子' },
      { src: '/tracing/tree.svg', label: '大树' },
      { src: '/tracing/cat.svg', label: '小猫' },
    ],
    slow_line: [
      { src: '/tracing/butterfly.svg', label: '蝴蝶' },
      { src: '/tracing/star.svg', label: '星星' },
      { src: '/tracing/fish.svg', label: '小鱼' },
    ],
    planet: [
      { src: '/tracing/star.svg', label: '星星' },
      { src: '/tracing/sun.svg', label: '太阳' },
      { src: '/tracing/butterfly.svg', label: '蝴蝶' },
    ],
    kitty: [
      { src: '/tracing/cat.svg', label: '小猫' },
      { src: '/tracing/fish.svg', label: '小鱼' },
      { src: '/tracing/butterfly.svg', label: '蝴蝶' },
    ],
    bunny: [
      { src: '/tracing/tree.svg', label: '大树' },
      { src: '/tracing/house.svg', label: '房子' },
      { src: '/tracing/butterfly.svg', label: '蝴蝶' },
    ],
    fish: [
      { src: '/tracing/fish.svg', label: '小鱼' },
      { src: '/tracing/star.svg', label: '星星' },
      { src: '/tracing/sun.svg', label: '太阳' },
    ],
  };

  const defaultTracing = Object.values(THEME_TRACING).flat().filter(
    (v, i, a) => a.findIndex(t => t.src === v.src) === i // 去重
  );
  const themedTracing = themeId && THEME_TRACING[themeId] ? THEME_TRACING[themeId] : defaultTracing;

  const items = mode === 'tracing' ? (tracingItems || themedTracing) : allStickers;

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-2.5 rounded-[1.25rem] bg-white"
      style={{ border: '2px solid #1A1A1A', boxShadow: '4px 4px 0 #1A1A1A', maxWidth: 'calc(100vw - 2rem)' }}
    >
      {items.map(item => (
        <motion.button
          key={item.src || item.id}
          whileHover={{ scale: 1.2, y: -5 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => {
            if (mode === 'tracing') {
              onSelectTracing?.(item.src);
            } else {
              onSelectSticker?.({ id: item.id || '', src: item.src, label: item.label, emoji: '' });
            }
          }}
          className="flex flex-col items-center gap-0.5 flex-shrink-0"
          title={item.label}
        >
          <div
            className="rounded-xl flex items-center justify-center bg-white flex-shrink-0"
            style={{ width: 42, height: 42, border: '2px solid #E5E5E5' }}
          >
            <img src={item.src} alt={item.label} style={{ width: 30, height: 30, objectFit: 'contain' }} draggable={false} />
          </div>
          <span style={{ fontSize: '0.52rem', fontWeight: 700, color: '#888', whiteSpace: 'nowrap' }}>{item.label}</span>
        </motion.button>
      ))}

      {/* Tracing controls — lock, hide, delete */}
      {mode === 'tracing' && hasTracing && (
        <>
          <div style={{ width: 2, height: 28, background: '#E5E5E5', borderRadius: 1, margin: '0 2px' }} />
          <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.85 }}
            onClick={onToggleLock}
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: tracingLocked ? '#7DC353' : '#E5E5E5', border: '2px solid #1A1A1A' }}
            title={tracingLocked ? '解锁' : '锁定'}>
            <span style={{ fontSize: '0.85rem' }}>{tracingLocked ? '🔒' : '🔓'}</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.85 }}
            onClick={onToggleVisible}
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: tracingVisible ? '#F9B801' : '#E5E5E5', border: '2px solid #1A1A1A' }}
            title={tracingVisible ? '隐藏' : '显示'}>
            <span style={{ fontSize: '0.85rem' }}>{tracingVisible ? '👁️' : '‍—'}</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.85 }}
            onClick={onDeleteTracing}
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: '#F302C9', border: '2px solid #1A1A1A' }}
            title="删除当前">
            <span style={{ fontSize: '0.85rem', color: '#FFF' }}>✕</span>
          </motion.button>
          {onClearAllTracing && (
            <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.85 }}
              onClick={onClearAllTracing}
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ width: 32, height: 32, background: '#1A1A1A', border: '2px solid #1A1A1A' }}
              title="清空全部">
              <span style={{ fontSize: '0.75rem', color: '#FFF', fontWeight: 900 }}>清空</span>
            </motion.button>
          )}
        </>
      )}

      {/* Divider */}
      <div style={{ width: 2, height: 32, background: '#E5E5E5', borderRadius: 1, margin: '0 4px' }} />

      {/* Switch to brush */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.85 }}
        onClick={onSwitchToBrush}
        className="rounded-full flex items-center justify-center flex-shrink-0 gap-1 px-2"
        style={{ height: 36, background: '#1A1A1A', border: '2px solid #1A1A1A' }}
        title="切画笔"
      >
        <Brush size={15} strokeWidth={2.5} color="#FFFFFF" />
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#FFFFFF' }}>画笔</span>
      </motion.button>

      {/* Close */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.85 }}
        onClick={onClose}
        className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{ width: 30, height: 30, background: '#F302C9', border: '2px solid #1A1A1A' }}
        title="关闭"
      >
        <X size={14} strokeWidth={3} color="#FFFFFF" />
      </motion.button>
    </motion.div>
  );
}

export { COMMON_STICKERS, THEME_STICKERS };
