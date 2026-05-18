'use client';

import { motion } from 'framer-motion';
import { PaintMode } from './PaintCanvas';

interface ModeSelectorProps {
  current: PaintMode;
  onChange: (mode: PaintMode) => void;
}

const modes: { key: PaintMode; label: string; icon: string; color: string }[] = [
  { key: 'follow', label: '跟画', icon: '✏️', color: '#F9B801' },
  { key: 'auto',   label: '自动', icon: '▶️', color: '#F302C9' },
  { key: 'free',   label: '自由', icon: '🎨', color: '#7DC353' },
];

export default function ModeSelector({ current, onChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-0.5 p-1 rounded-full"
      style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}>
      {modes.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className="relative px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
          style={{ color: current === m.key ? '#1A1A1A' : '#888888', letterSpacing: '-0.01em' }}
          title={m.label}
        >
          {current === m.key && (
            <motion.div
              layoutId="modeHighlight"
              className="absolute inset-0 rounded-full"
              style={{ background: m.color }}
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
