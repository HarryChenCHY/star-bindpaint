'use client';

import { motion } from 'framer-motion';
import { PaintMode } from './PaintCanvas';

interface ModeSelectorProps {
  current: PaintMode;
  onChange: (mode: PaintMode) => void;
}

const modes: { key: PaintMode; label: string; icon: string; desc: string }[] = [
  { key: 'follow', label: '跟画', icon: '✏️', desc: 'AI 引导逐笔跟画' },
  { key: 'auto', label: '自动', icon: '▶️', desc: 'AI 自动绘制观看' },
  { key: 'free', label: '自由', icon: '🎨', desc: '自由发挥创作' },
];

export default function ModeSelector({ current, onChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {modes.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className="relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
          style={{ color: current === m.key ? 'white' : 'rgba(237,233,254,0.5)', letterSpacing: '-0.01em' }}
          title={m.desc}
        >
          {current === m.key && (
            <motion.div
              layoutId="modeHighlight"
              className="absolute inset-0 rounded-full"
              style={{ background: '#7C3AED' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1">
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
