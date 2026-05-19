'use client';

import { motion } from 'framer-motion';

export type Emotion = 'happy' | 'calm' | 'anxious' | 'sad';

interface EmotionPickerProps {
  selected: string;
  onSelect: (emotion: Emotion) => void;
  label?: string;
}

const EMOTIONS: { id: Emotion; icon: string; label: string; color: string }[] = [
  { id: 'happy', icon: '☀️', label: '开心', color: '#F9B801' },
  { id: 'calm', icon: '☁️', label: '平静', color: '#7BA7CC' },
  { id: 'anxious', icon: '⚡', label: '紧张', color: '#F59E0B' },
  { id: 'sad', icon: '🌧️', label: '难过', color: '#94A3B8' },
];

export default function EmotionPicker({ selected, onSelect, label }: EmotionPickerProps) {
  return (
    <div>
      {label && (
        <p className="text-center mb-4" style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A1A' }}>
          {label}
        </p>
      )}
      <div className="grid grid-cols-4 gap-3">
        {EMOTIONS.map(e => (
          <motion.button
            key={e.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelect(e.id)}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
            style={{
              border: selected === e.id ? `3px solid ${e.color}` : '2px solid #E5E5E5',
              background: selected === e.id ? `${e.color}15` : 'white',
            }}
          >
            <span className="text-3xl">{e.icon}</span>
            <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1A1A1A' }}>{e.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export { EMOTIONS };
