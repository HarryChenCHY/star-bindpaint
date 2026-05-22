'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, Sparkles } from 'lucide-react';

interface CalmBreathingProps {
  onReturn: () => void;
}

type Phase = 'inhale' | 'hold' | 'exhale';

const PHASE_LABEL: Record<Phase, string> = {
  inhale: '吸气',
  hold: '保持',
  exhale: '呼气',
};

const CYCLE = 10_000;

export default function CalmBreathing({ onReturn }: CalmBreathingProps) {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('inhale');

  useEffect(() => {
    const tick = () => {
      setPhase('inhale');
      const t1 = setTimeout(() => setPhase('hold'), 4000);
      const t2 = setTimeout(() => setPhase('exhale'), 7000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    };
    let cleanup = tick();
    const id = setInterval(() => { cleanup?.(); cleanup = tick(); }, CYCLE);
    return () => { clearInterval(id); cleanup?.(); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7"
      style={{ background: '#F5F4EE' }}
    >
      {/* 顶部标签 */}
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full"
        style={{
          background: '#FFFFFF',
          border: '2px solid #1A1A1A',
          boxShadow: '3px 3px 0 #1A1A1A',
        }}
      >
        <Wind size={14} strokeWidth={2.5} color="#7BA7CC" />
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 900,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#1A1A1A',
          }}
        >
          Breathe · 深呼吸
        </span>
      </motion.div>

      {/* 呼吸圆圈 */}
      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* 外层呼吸光环 */}
        <motion.div
          animate={{ scale: [1, 1.55, 1.55, 1], opacity: [0.32, 0.08, 0.08, 0.32] }}
          transition={{ duration: 10, repeat: Infinity, times: [0, 0.4, 0.7, 1], ease: 'easeInOut' }}
          className="absolute rounded-full"
          style={{
            width: 240,
            height: 240,
            border: '2px solid #1A1A1A',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1.4, 1], opacity: [0.5, 0.18, 0.18, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, times: [0, 0.4, 0.7, 1], ease: 'easeInOut' }}
          className="absolute rounded-full"
          style={{
            width: 200,
            height: 200,
            border: '2px solid #1A1A1A',
          }}
        />

        {/* 主圆 */}
        <motion.div
          animate={{ scale: [1, 1.5, 1.5, 1] }}
          transition={{ duration: 10, repeat: Infinity, times: [0, 0.4, 0.7, 1], ease: 'easeInOut' }}
          className="rounded-full flex items-center justify-center"
          style={{
            width: 156,
            height: 156,
            background: '#7BA7CC',
            border: '2.5px solid #1A1A1A',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              initial={{ opacity: 0, scale: 0.7, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              style={{
                color: '#FFFFFF',
                fontSize: '1.15rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
              }}
            >
              {PHASE_LABEL[phase]}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 标题 */}
      <div className="flex flex-col items-center gap-2">
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: '#1A1A1A',
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          慢慢呼吸<span style={{ color: '#7BA7CC' }}>...</span>
        </h2>
        <p
          style={{
            fontSize: '0.82rem',
            color: '#888888',
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: 260,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          没关系，我们休息一下。<br />
          看着圆圈慢慢变大、变小。
        </p>
      </div>

      {/* 按钮 */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 4.5, type: 'spring', stiffness: 280, damping: 22 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          if (ready) onReturn();
          else setReady(true);
        }}
        className="rounded-full flex items-center gap-2"
        style={{
          background: ready ? '#7DC353' : '#FFFFFF',
          color: '#1A1A1A',
          padding: '0.85em 1.8em',
          fontSize: '0.88rem',
          fontWeight: 900,
          letterSpacing: '-0.01em',
          border: '2px solid #1A1A1A',
          boxShadow: '4px 4px 0 #1A1A1A',
        }}
      >
        {ready ? (
          <>
            <Sparkles size={14} strokeWidth={2.8} />
            继续画画
          </>
        ) : (
          '我准备好了'
        )}
      </motion.button>
    </motion.div>
  );
}
