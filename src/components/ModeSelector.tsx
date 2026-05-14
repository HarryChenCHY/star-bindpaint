'use client';

import { motion } from 'framer-motion';
import { PaintMode } from './PaintCanvas';

interface ModeSelectorProps {
  current: PaintMode;
  onChange: (mode: PaintMode) => void;
}

const modes: { key: PaintMode; label: string; icon: string; desc: string }[] = [
  { key: 'follow', label: '跟画', icon: '✏️', desc: 'AI引导逐笔跟画' },
  { key: 'auto', label: '自动', icon: '▶️', desc: 'AI自动绘制观看' },
  { key: 'free', label: '自由', icon: '🎨', desc: '自由发挥创作' },
];

export default function ModeSelector({ current, onChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-2 bg-white/5 rounded-full p-1">
      {modes.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`
            relative px-4 py-2 rounded-full text-sm font-medium transition-all
            ${current === m.key ? 'text-white' : 'text-white/60 hover:text-white/80'}
          `}
          title={m.desc}
        >
          {current === m.key && (
            <motion.div
              layoutId="modeHighlight"
              className="absolute inset-0 bg-primary rounded-full"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10">{m.icon} {m.label}</span>
        </button>
      ))}
    </div>
  );
}
