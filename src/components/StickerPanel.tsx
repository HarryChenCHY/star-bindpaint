'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brush, X, ChevronRight } from 'lucide-react';

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
    { id: 'house', src: '/stickers/house.svg', label: '小房子', emoji: '🏠' },
    { id: 'tree', src: '/stickers/tree.svg', label: '大树', emoji: '🌳' },
  ],
  mood: [
    { id: 'color-blob', src: '/stickers/color-blob.svg', label: '色块', emoji: '🫧' },
    { id: 'wave-line', src: '/stickers/wave-line.svg', label: '波浪线', emoji: '〰️' },
    { id: 'zigzag-line', src: '/stickers/zigzag-line.svg', label: '锯齿线', emoji: '⚡' },
    { id: 'circle-shape', src: '/stickers/circle-shape.svg', label: '圆圈', emoji: '⭕' },
    { id: 'square-shape', src: '/stickers/square-shape.svg', label: '方块', emoji: '⬜' },
    { id: 'dot-cluster', src: '/stickers/dot-cluster.svg', label: '小点点', emoji: '✨' },
    { id: 'star', src: '/stickers/star.svg', label: '星星', emoji: '⭐' },
  ],
  safe_place: [
    { id: 'house', src: '/stickers/house.svg', label: '房子', emoji: '🏠' },
    { id: 'tree', src: '/stickers/tree.svg', label: '大树', emoji: '🌳' },
    { id: 'bird', src: '/stickers/bird.svg', label: '小鸟', emoji: '🐦' },
    { id: 'catface', src: '/stickers/catface.svg', label: '小猫', emoji: '🐱' },
    { id: 'moon', src: '/stickers/moon.svg', label: '月亮', emoji: '🌙' },
  ],
  slow_line: [
    { id: 'snail', src: '/stickers/snail.svg', label: '蜗牛', emoji: '🐌' },
    { id: 'river-curve', src: '/stickers/river-curve.svg', label: '弯弯线', emoji: '🌊' },
    { id: 'stone', src: '/stickers/stone.svg', label: '石头', emoji: '🪨' },
    { id: 'butterfly', src: '/stickers/butterfly.svg', label: '蝴蝶', emoji: '🦋' },
    { id: 'sparkle', src: '/stickers/sparkle.svg', label: '星光', emoji: '✨' },
  ],
  planet: [
    { id: 'planet', src: '/stickers/planet.svg', label: '星球', emoji: '🌍' },
    { id: 'house', src: '/stickers/house.svg', label: '小房子', emoji: '🏡' },
    { id: 'tree', src: '/stickers/tree.svg', label: '小树', emoji: '🌳' },
    { id: 'catface', src: '/stickers/catface.svg', label: '小动物', emoji: '🐱' },
    { id: 'moon', src: '/stickers/moon.svg', label: '月亮', emoji: '🌙' },
    { id: 'ring', src: '/stickers/ring.svg', label: '光环', emoji: '🛡️' },
    { id: 'rocket', src: '/stickers/rocket.svg', label: '火箭', emoji: '🚀' },
  ],
  kitty: [
    { id: 'cat-head', src: '/stickers/cat-head.svg', label: '圆脑袋', emoji: '⭕' },
    { id: 'cat-ear', src: '/stickers/cat-ear.svg', label: '尖耳朵', emoji: '△' },
    { id: 'cat-face-detail', src: '/stickers/cat-face-detail.svg', label: '眼鼻嘴', emoji: '👀' },
    { id: 'cat-body', src: '/stickers/cat-body.svg', label: '身体', emoji: '〰️' },
    { id: 'cat-tail', src: '/stickers/cat-tail.svg', label: '尾巴', emoji: '🌀' },
    { id: 'cat-paw', src: '/stickers/cat-paw.svg', label: '脚掌', emoji: '🐾' },
    { id: 'yarn', src: '/stickers/yarn.svg', label: '毛线球', emoji: '🧶' },
  ],
  bunny: [
    { id: 'bunny-body', src: '/stickers/bunny-body.svg', label: '圆身体', emoji: '⭕' },
    { id: 'bunny-head', src: '/stickers/bunny-head.svg', label: '圆脑袋', emoji: '🟡' },
    { id: 'bunnyear', src: '/stickers/bunnyear.svg', label: '长耳朵', emoji: '📏' },
    { id: 'bunny-face', src: '/stickers/bunny-face.svg', label: '表情', emoji: '👀' },
    { id: 'carrot', src: '/stickers/carrot.svg', label: '胡萝卜', emoji: '🥕' },
    { id: 'grass', src: '/stickers/grass.svg', label: '草叶', emoji: '🌿' },
  ],
  fish: [
    { id: 'fish-body', src: '/stickers/fish-body.svg', label: '鱼身体', emoji: '🏈' },
    { id: 'fish-tail', src: '/stickers/fish-tail.svg', label: '鱼尾巴', emoji: '△' },
    { id: 'fish-face', src: '/stickers/fish-face.svg', label: '眼和嘴', emoji: '👁️' },
    { id: 'fish-fin', src: '/stickers/fish-fin.svg', label: '鱼鳍', emoji: '🌊' },
    { id: 'bubble', src: '/stickers/bubble.svg', label: '气泡', emoji: '💧' },
    { id: 'seaweed', src: '/stickers/seaweed.svg', label: '水草', emoji: '🌿' },
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
  onCollapse?: () => void;
  /** 拼贴模式：贴纸栏常开，隐藏关闭按钮，选贴纸不自动收起 */
  persistent?: boolean;
  /** 嵌入页面布局（不 fixed 悬浮） */
  docked?: boolean;
  /** fixed 模式：距视口底部的偏移，默认贴底栏上方 */
  bottomOffset?: string;
}

export default function StickerPanel({
  mode, themeId, tracingItems,
  tracingLocked, tracingVisible, hasTracing,
  onSelectSticker, onSelectTracing,
  onToggleLock, onToggleVisible, onDeleteTracing, onClearAllTracing,
  onSwitchToBrush, onClose, onCollapse,
  persistent = false,
  docked = false,
  bottomOffset = 'calc(4.75rem + env(safe-area-inset-bottom, 0px))',
}: StickerPanelProps) {
  const themeStickers = THEME_STICKERS[themeId || ''] || [];
  const themeIds = new Set(themeStickers.map(s => s.id));
  const commonExtras = COMMON_STICKERS.filter(s => !themeIds.has(s.id));
  const allStickers = themeId && themeStickers.length > 0
    ? [...themeStickers, ...commonExtras]
    : [...COMMON_STICKERS, ...themeStickers];

  const THEME_TRACING: Record<string, { src: string; label: string }[]> = {
    weather: [
      { src: '/tracing/sun.svg', label: '太阳' },
      { src: '/tracing/cloud.svg', label: '云朵' },
      { src: '/tracing/rainbow.svg', label: '彩虹' },
      { src: '/tracing/raindrop.svg', label: '雨滴' },
      { src: '/tracing/house.svg', label: '小房子' },
      { src: '/tracing/tree.svg', label: '大树' },
    ],
    mood: [
      { src: '/tracing/color-blob.svg', label: '色块' },
      { src: '/tracing/wave-line.svg', label: '波浪线' },
      { src: '/tracing/zigzag-line.svg', label: '锯齿线' },
      { src: '/tracing/circle-shape.svg', label: '圆圈' },
      { src: '/tracing/square-shape.svg', label: '方块' },
      { src: '/tracing/dot-cluster.svg', label: '小点点' },
      { src: '/tracing/star.svg', label: '星星' },
    ],
    safe_place: [
      { src: '/tracing/house.svg', label: '房子' },
      { src: '/tracing/tree.svg', label: '大树' },
      { src: '/tracing/flower.svg', label: '小花' },
      { src: '/tracing/cat.svg', label: '小猫' },
      { src: '/tracing/star.svg', label: '星星' },
      { src: '/tracing/moon.svg', label: '月亮' },
    ],
    slow_line: [
      { src: '/tracing/snail.svg', label: '蜗牛' },
      { src: '/tracing/start-dot.svg', label: '起点' },
      { src: '/tracing/river-curve.svg', label: '弯弯线' },
      { src: '/tracing/flower.svg', label: '小花' },
      { src: '/tracing/stone.svg', label: '石头' },
    ],
    planet: [
      { src: '/tracing/planet.svg', label: '星球' },
      { src: '/tracing/house-on-planet.svg', label: '星球+房子' },
      { src: '/tracing/tree-on-planet.svg', label: '星球+树' },
      { src: '/tracing/star.svg', label: '星星' },
      { src: '/tracing/moon.svg', label: '月亮' },
      { src: '/tracing/ring.svg', label: '保护光环' },
    ],
    kitty: [
      { src: '/tracing/cat-head.svg', label: '圆脑袋' },
      { src: '/tracing/cat-ears.svg', label: '尖耳朵' },
      { src: '/tracing/cat-face-detail.svg', label: '眼鼻嘴' },
      { src: '/tracing/cat-body.svg', label: '身体' },
      { src: '/tracing/cat-tail.svg', label: '身体+尾巴' },
      { src: '/tracing/cat-paws-whiskers.svg', label: '脚掌胡须' },
    ],
    bunny: [
      { src: '/tracing/bunny-body.svg', label: '圆身体' },
      { src: '/tracing/bunny-head.svg', label: '圆脑袋' },
      { src: '/tracing/bunny-ears.svg', label: '长耳朵' },
      { src: '/tracing/bunny-face.svg', label: '表情' },
      { src: '/tracing/carrot.svg', label: '胡萝卜' },
      { src: '/tracing/grass-patch.svg', label: '小草' },
    ],
    fish: [
      { src: '/tracing/fish-body.svg', label: '鱼身体' },
      { src: '/tracing/fish-tail.svg', label: '鱼尾巴' },
      { src: '/tracing/fish-face.svg', label: '眼和嘴' },
      { src: '/tracing/fish-fins.svg', label: '鱼鳍花纹' },
      { src: '/tracing/bubble-group.svg', label: '泡泡' },
      { src: '/tracing/seaweed.svg', label: '水草' },
    ],
  };

  const defaultTracing = Object.values(THEME_TRACING).flat().filter(
    (v, i, a) => a.findIndex(t => t.src === v.src) === i // 去重
  );
  const themedTracing = themeId && THEME_TRACING[themeId] ? THEME_TRACING[themeId] : defaultTracing;

  const tracingList = tracingItems || themedTracing;

  const renderItemButton = (
    item: { src: string; label: string },
    key: string,
    onClick: () => void,
  ) => (
    <motion.button
      key={key}
      whileHover={{ scale: 1.2, y: -5 }}
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
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
  );

  return (
    <motion.div
      initial={docked ? { opacity: 0 } : { y: 120, opacity: 0 }}
      animate={docked ? { opacity: 1 } : { y: 0, opacity: 1 }}
      exit={docked ? { opacity: 0 } : { y: 120, opacity: 0 }}
      className={
        docked
          ? 'relative z-10 w-full flex items-center gap-1.5 px-2 py-2 sm:px-3 sm:py-2.5 rounded-[1.25rem] bg-white mx-auto'
          : 'fixed left-1/2 -translate-x-1/2 z-[45] flex items-center gap-1.5 px-3 py-2.5 rounded-[1.25rem] bg-white'
      }
      style={{
        border: '2px solid #1A1A1A',
        boxShadow: '4px 4px 0 #1A1A1A',
        maxWidth: docked ? '100%' : 'calc(100vw - 2rem)',
        ...(docked ? {} : { bottom: bottomOffset }),
      }}
    >
      <div
        className="flex items-center gap-1.5 overflow-x-auto flex-nowrap min-w-0"
        style={{ maxWidth: 'calc(100vw - 9rem)', scrollbarWidth: 'thin' }}
      >
        {mode === 'tracing'
          ? tracingList.map(item => renderItemButton(item, item.src, () => onSelectTracing?.(item.src)))
          : allStickers.map(item => renderItemButton(item, item.id, () => onSelectSticker?.(item)))}
      </div>

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

      {/* Switch to brush — 拼贴常开模式下隐藏 */}
      {!persistent && (
        <>
          <div style={{ width: 2, height: 32, background: '#E5E5E5', borderRadius: 1, margin: '0 4px' }} />
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
        </>
      )}

      {/* Close — 拼贴常开模式下隐藏 */}
      {!persistent && (
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
      )}
      {/* 收起 — 贴到侧边 */}
      {persistent && onCollapse && (
        <motion.button
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.85 }}
          onClick={onCollapse}
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 30, height: 30, background: '#E5E5E5', border: '2px solid #1A1A1A' }}
          title="收起贴纸栏"
        >
          <ChevronRight size={14} strokeWidth={3} color="#1A1A1A" />
        </motion.button>
      )}
    </motion.div>
  );
}

export { COMMON_STICKERS, THEME_STICKERS };
