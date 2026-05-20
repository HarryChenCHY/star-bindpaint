'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
 * 主题步骤引导条 — 显示在画布上方
 */
export function ThemeStepGuide({ theme, currentStep, onNextStep }: {
  theme: FreeTheme;
  currentStep: number;
  onNextStep: () => void;
}) {
  const step = theme.steps[currentStep];
  const isLast = currentStep >= theme.steps.length - 1;

  return (
    <motion.div
      key={currentStep}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-3 left-3 right-3 z-10 flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.95)', border: '2px solid #E5E5E5', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      {/* 步骤进度 */}
      <div className="flex gap-1 flex-shrink-0">
        {theme.steps.map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ background: i <= currentStep ? '#7A51EC' : '#E5E5E5' }}
          />
        ))}
      </div>

      {/* 当前步骤提示 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{step?.icon}</span>
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1A1A1A' }}>
            {step?.hint}
          </span>
        </div>
      </div>

      {/* 下一步按钮 */}
      <button
        onClick={onNextStep}
        className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
        style={{ background: isLast ? '#7DC353' : '#7A51EC', color: 'white' }}
      >
        {isLast ? '画好了 ✓' : '下一步 →'}
      </button>
    </motion.div>
  );
}
