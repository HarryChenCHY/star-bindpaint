'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface ThemeStep {
  icon: string;
  label: string;
  hint: string; // 给孩子看的提示
}

export interface FreeTheme {
  id: string;
  icon: string;
  label: string;
  steps: ThemeStep[];
  sdPrompt: string; // 给 SD API 的精准 prompt（不含风格，风格单独注入）
}

// 5 个预设主题，每个有 3-4 步引导 + 精准 SD prompt
export const FREE_THEMES: FreeTheme[] = [
  {
    id: 'weather',
    icon: '🌤️',
    label: '画出今天的天气',
    steps: [
      { icon: '☀️', label: '太阳', hint: '先画一个大大的太阳！圆圆的，有光芒' },
      { icon: '☁️', label: '云朵', hint: '再画几朵软软的云，像棉花糖一样' },
      { icon: '🌈', label: '彩虹或雨', hint: '如果是晴天画彩虹，下雨就画雨滴' },
      { icon: '🏠', label: '地面', hint: '最后画一点地面，小房子或者小树' },
    ],
    sdPrompt: 'a cheerful landscape with sun, clouds, and sky, children drawing style, simple and colorful',
  },
  {
    id: 'mood',
    icon: '🎨',
    label: '用颜色画出心情',
    steps: [
      { icon: '🫧', label: '选颜色', hint: '选一个代表你心情的颜色，大胆涂上去' },
      { icon: '〰️', label: '画线条', hint: '开心画波浪线，难过画直线，紧张画锯齿' },
      { icon: '⭕', label: '画形状', hint: '用圆圈、方块或者星星填满画面' },
      { icon: '✨', label: '加装饰', hint: '最后加一些小点点或小星星' },
    ],
    sdPrompt: 'abstract emotional artwork with flowing colors and shapes, expressive and vibrant, artistic mood painting',
  },
  {
    id: 'safe_place',
    icon: '🏠',
    label: '画一个安全的地方',
    steps: [
      { icon: '🏠', label: '房子', hint: '画一个让你感到安全的小房子' },
      { icon: '🌳', label: '树和花', hint: '在旁边画一棵大树和小花' },
      { icon: '🐱', label: '小动物', hint: '画一个陪伴你的小动物' },
      { icon: '💫', label: '天空', hint: '画蓝天或者星空，让画面完整' },
    ],
    sdPrompt: 'a cozy safe house with garden, trees and flowers, warm and peaceful scenery, gentle sunlight, a small cute animal nearby',
  },
  {
    id: 'slow_line',
    icon: '〰️',
    label: '画一条慢慢走的线',
    steps: [
      { icon: '🐌', label: '起点', hint: '从画面左边开始，慢慢画一条线' },
      { icon: '🌊', label: '弯弯', hint: '让线条弯一弯，像小河一样流动' },
      { icon: '🌸', label: '沿途', hint: '线走过的地方画一些小东西：花、石头' },
    ],
    sdPrompt: 'a winding path through a peaceful meadow with wildflowers, gentle river, stones along the way, serene nature',
  },
  {
    id: 'planet',
    icon: '🪐',
    label: '画一个保护你的小星球',
    steps: [
      { icon: '🌍', label: '星球', hint: '画一个大圆，这是你的小星球' },
      { icon: '🏡', label: '星球上', hint: '在星球上画你喜欢的东西：树、房子、小动物' },
      { icon: '⭐', label: '宇宙', hint: '在星球周围画小星星和月亮' },
      { icon: '🛡️', label: '保护', hint: '画一圈光环保护你的星球' },
    ],
    sdPrompt: 'a small magical planet floating in space with a tiny house and trees on it, surrounded by stars and gentle light, the little prince style',
  },
];

interface FreeModeThemesProps {
  onSelect: (theme: FreeTheme) => void;
  onSkip: () => void;
}

export default function FreeModeThemes({ onSelect, onSkip }: FreeModeThemesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 w-full max-w-sm"
    >
      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#888', textAlign: 'center' }}>
        选一个梦想，让 Starry 陪你把它画出来
      </p>
      <div className="grid grid-cols-1 gap-2">
        {FREE_THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ border: '2px solid #E5E5E5', background: 'white' }}
          >
            <span className="text-xl">{t.icon}</span>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1A1A' }}>{t.label}</span>
              <span style={{ fontSize: '0.7rem', color: '#BBB', fontWeight: 600, marginLeft: 8 }}>
                {t.steps.length} 步引导
              </span>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="text-center mt-2"
        style={{ color: '#BBB', fontWeight: 600, fontSize: '0.8rem' }}
      >
        或者，跟着心画...
      </button>
    </motion.div>
  );
}

/**
 * 主题步骤引导卡片 — 固定在右侧、位于精灵卡片下方
 * 鼠标悬停时根据指针位置 3D 倾斜
 */
export function ThemeStepGuide({ theme, currentStep, onNextStep, compact = false }: {
  theme: FreeTheme;
  currentStep: number;
  onNextStep: () => void;
  compact?: boolean;
}) {
  const step = theme.steps[currentStep];
  const isLast = currentStep >= theme.steps.length - 1;

  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 220, damping: 18, mass: 0.5 });
  // 鼠标 → 倾斜角度（最大 ±10°）
  const rotateX = useTransform(sy, [-1, 1], [10, -10]);
  const rotateY = useTransform(sx, [-1, 1], [-10, 10]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    mx.set(cx / (rect.width / 2));
    my.set(cy / (rect.height / 2));
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      key={currentStep}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="flex flex-col gap-2 rounded-[1.1rem] bg-white w-full min-w-0"
      style={{
        border: '2px solid #1A1A1A',
        boxShadow: compact ? '3px 3px 0 #1A1A1A' : '4px 4px 0 #1A1A1A',
        padding: compact ? '0.55rem' : '0.75rem',
        rotateX,
        rotateY,
        transformPerspective: 800,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 步骤进度 dots */}
      <div className="flex gap-1 justify-center">
        {theme.steps.map((_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === currentStep ? 14 : 6,
              height: 6,
              background: i <= currentStep ? '#7A51EC' : '#E5E5E5',
              transition: 'width 0.25s ease, background 0.25s ease',
            }}
          />
        ))}
      </div>

      {/* 当前步骤提示 */}
      <div
        className="flex flex-col items-center gap-1 text-center"
        style={{ transform: 'translateZ(20px)' }}
      >
        <span style={{ fontSize: compact ? '1.2rem' : '1.5rem', lineHeight: 1 }}>{step?.icon}</span>
        <span
          style={{
            fontWeight: 800,
            fontSize: compact ? 'clamp(0.62rem, 3.2vw, 0.75rem)' : '0.78rem',
            color: '#1A1A1A',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}
        >
          {step?.hint}
        </span>
      </div>

      {/* 下一步按钮 */}
      <motion.button
        onClick={onNextStep}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="rounded-full"
        style={{
          background: isLast ? '#7DC353' : '#7A51EC',
          color: 'white',
          fontWeight: 900,
          fontSize: compact ? 'clamp(0.66rem, 3vw, 0.75rem)' : '0.75rem',
          padding: compact ? '0.45em 0.65em' : '0.5em 0.9em',
          border: '2px solid #1A1A1A',
          boxShadow: '2px 2px 0 #1A1A1A',
          letterSpacing: '-0.01em',
          transform: 'translateZ(15px)',
        }}
      >
        {isLast ? '画好了 ✓' : '下一步 →'}
      </motion.button>
    </motion.div>
  );
}
