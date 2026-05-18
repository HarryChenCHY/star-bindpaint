'use client';

import { motion, AnimatePresence } from 'framer-motion';

export type SpriteState = 'idle' | 'guiding' | 'cheering' | 'thinking';

interface StarrySpriteProps {
  state: SpriteState;
  message?: string;
  className?: string;
}

export default function StarrySprite({ state, message, className = '' }: StarrySpriteProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* 对话气泡 */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl px-4 py-2 text-sm max-w-[200px] text-center relative"
            style={{ background: '#FFFFFF', border: '2px solid #1A1A1A', color: '#1A1A1A', fontWeight: 700 }}
          >
            {message}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
              style={{ background: '#FFFFFF', borderRight: '2px solid #1A1A1A', borderBottom: '2px solid #1A1A1A' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 精灵本体 */}
      <motion.div
        animate={getAnimation(state)}
        transition={getTransition(state)}
        className="relative"
      >
        <StarSVG state={state} />
        {state === 'cheering' && <CheerParticles />}
      </motion.div>
    </div>
  );
}

function StarSVG({ state }: { state: SpriteState }) {
  const fillColor = state === 'cheering' ? '#F9B801' :
    state === 'guiding' ? '#F9B801' :
    state === 'thinking' ? '#7A51EC' : '#F9B801';

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      {/* 星星主体 */}
      <path
        d="M32 8L37.5 24.5H54L40.5 34L46 50.5L32 40L18 50.5L23.5 34L10 24.5H26.5L32 8Z"
        fill={fillColor}
        stroke="#1A1A1A"
        strokeWidth="2"
      />
      {/* 眼睛 */}
      <circle cx="27" cy="30" r="2.5" fill="#1A1A1A" />
      <circle cx="37" cy="30" r="2.5" fill="#1A1A1A" />
      <circle cx="28" cy="29" r="1" fill="white" />
      <circle cx="38" cy="29" r="1" fill="white" />
      {/* 嘴巴 */}
      {state === 'cheering' && (
        <path d="M28 36 Q32 40 36 36" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      {(state === 'guiding' || state === 'idle') && (
        <path d="M29 36 Q32 38 35 36" stroke="#1A1A1A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      {state === 'thinking' && (
        <circle cx="32" cy="37" r="2" fill="#1A1A1A" />
      )}
    </svg>
  );
}

function CheerParticles() {
  const colors = ['#F9B801', '#7A51EC', '#F302C9', '#7DC353', '#F9B801', '#F302C9'];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{ background: colors[i], left: '50%', top: '50%' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(i * 60 * Math.PI / 180) * 30,
            y: Math.sin(i * 60 * Math.PI / 180) * 30,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function getAnimation(state: SpriteState) {
  switch (state) {
    case 'idle':
      return { y: [0, -6, 0], rotate: [0, 3, -2, 0] };
    case 'guiding':
      return { y: [0, -4, 0], scale: [1, 1.05, 1] };
    case 'cheering':
      return { y: [0, -12, 0], rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] };
    case 'thinking':
      return { rotate: [0, 360] };
  }
}

function getTransition(state: SpriteState) {
  switch (state) {
    case 'idle':
      return { duration: 4, repeat: Infinity, ease: 'easeInOut' as const };
    case 'guiding':
      return { duration: 2, repeat: Infinity, ease: 'easeInOut' as const };
    case 'cheering':
      return { duration: 0.6, repeat: 2, ease: 'easeOut' as const };
    case 'thinking':
      return { duration: 2, repeat: Infinity, ease: 'linear' as const };
  }
}
