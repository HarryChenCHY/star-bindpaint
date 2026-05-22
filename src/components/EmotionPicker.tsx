'use client';

import { motion } from 'framer-motion';

export type Emotion = 'happy' | 'calm' | 'anxious' | 'sad';

interface EmotionPickerProps {
  selected: string;
  onSelect: (emotion: Emotion) => void;
  label?: string;
}

const EMOTIONS: { id: Emotion; icon: string; label: string; color: string; tilt: number }[] = [
  { id: 'happy',   icon: '☀️', label: '开心', color: '#F9B801', tilt: -3 },
  { id: 'calm',    icon: '☁️', label: '平静', color: '#7BA7CC', tilt:  2 },
  { id: 'anxious', icon: '⚡', label: '紧张', color: '#F302C9', tilt: -2 },
  { id: 'sad',     icon: '🌧️', label: '难过', color: '#7A51EC', tilt:  3 },
];

export default function EmotionPicker({ selected, onSelect, label }: EmotionPickerProps) {
  return (
    <div style={{ padding: '0.25rem' }}>
      {label && (
        <p
          className="text-center mb-5"
          style={{
            fontWeight: 900,
            fontSize: '1.05rem',
            color: '#1A1A1A',
            letterSpacing: '-0.02em',
          }}
        >
          {label}
        </p>
      )}
      <div className="grid grid-cols-4 gap-3 px-2">
        {EMOTIONS.map(e => {
          const isSelected = selected === e.id;
          return (
            <motion.button
              key={e.id}
              onClick={() => onSelect(e.id)}
              initial={false}
              animate={{
                rotate: isSelected ? 0 : 0,
                scale: isSelected ? 1.04 : 1,
              }}
              whileHover={{ rotate: e.tilt, y: -3, scale: isSelected ? 1.06 : 1.03 }}
              whileTap={{ scale: 0.94, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl"
              style={{
                aspectRatio: '1 / 1',
                border: '2px solid #1A1A1A',
                background: isSelected ? e.color : '#FFFFFF',
                boxShadow: isSelected
                  ? `5px 5px 0 #1A1A1A`
                  : `3px 3px 0 #1A1A1A`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {isSelected && (
                <motion.span
                  layoutId="emotion-check"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#1A1A1A',
                    color: '#FFFFFF',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  ✓
                </motion.span>
              )}
              <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>{e.icon}</span>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  color: isSelected ? '#FFFFFF' : '#1A1A1A',
                  letterSpacing: '-0.01em',
                  textShadow: isSelected ? '1px 1px 0 rgba(0,0,0,0.25)' : 'none',
                }}
              >
                {e.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export { EMOTIONS };
