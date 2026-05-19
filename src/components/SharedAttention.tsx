'use client';

import { motion } from 'framer-motion';

interface SharedAttentionProps {
  question: string;
  options: { label: string; correct: boolean }[];
  onAnswer: (option: { label: string; correct: boolean }) => void;
}

export default function SharedAttention({ question, options, onAnswer }: SharedAttentionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-xs text-center p-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: '#F9B801' }}>
          👀
        </div>
        <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1A1A1A', lineHeight: 1.5 }}>
          {question}
        </p>
        <div className="flex flex-col gap-2 w-full">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onAnswer(opt)}
              className="w-full p-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ border: '2px solid #E5E5E5', fontWeight: 700, fontSize: '0.95rem', color: '#1A1A1A' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
