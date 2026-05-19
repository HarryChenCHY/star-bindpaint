'use client';

import { motion } from 'framer-motion';

interface FreeModeThemesProps {
  onSelect: (theme: string) => void;
  onSkip: () => void;
}

const THEMES = [
  { id: 'weather', icon: '🌤️', label: '画出今天的天气' },
  { id: 'mood', icon: '🎨', label: '用颜色画出心情' },
  { id: 'safe_place', icon: '🏠', label: '画一个安全的地方' },
  { id: 'slow_line', icon: '〰️', label: '画一条慢慢走的线' },
  { id: 'planet', icon: '🪐', label: '画一个保护你的小星球' },
];

export default function FreeModeThemes({ onSelect, onSkip }: FreeModeThemesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 w-full max-w-sm"
    >
      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#888', textAlign: 'center' }}>
        想画什么？选一个主题，或者自由画
      </p>
      <div className="grid grid-cols-1 gap-2">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t.label)}
            className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ border: '2px solid #E5E5E5', background: 'white' }}
          >
            <span className="text-xl">{t.icon}</span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1A1A' }}>{t.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="text-center mt-2"
        style={{ color: '#BBB', fontWeight: 600, fontSize: '0.8rem' }}
      >
        不需要主题，直接画
      </button>
    </motion.div>
  );
}
