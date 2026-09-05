'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sparkles } from 'lucide-react';

export type CompanionState = 'idle' | 'guiding' | 'cheering' | 'thinking';

interface MoonCompanionProps {
  state: CompanionState;
  message?: string;
  compact?: boolean;
}

const STATE_LABELS: Record<CompanionState, string> = {
  idle: '月亮伙伴',
  guiding: '下一笔提示',
  cheering: '点亮星星',
  thinking: '正在规划星迹',
};

export default function MoonCompanion({ state, message, compact = false }: MoonCompanionProps) {
  return (
    <div className={`flex ${compact ? 'items-center gap-3' : 'flex-col items-center gap-3'}`}>
      <motion.div
        animate={state === 'thinking'
          ? { rotate: [0, -8, 8, 0], y: [0, -3, 0] }
          : state === 'cheering'
            ? { y: [0, -8, 0], scale: [1, 1.1, 1] }
            : { y: [0, -3, 0] }}
        transition={{ duration: state === 'cheering' ? 0.7 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex h-14 w-14 flex-none items-center justify-center rounded-[1.15rem]"
        style={{ background: '#FFD166', border: '2px solid #17233F', boxShadow: '3px 3px 0 #6558D9' }}
      >
        <Moon size={29} color="#17233F" strokeWidth={2.6} />
        {state === 'cheering' && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: '#69D2C2', border: '1.5px solid #17233F' }}>
            <Sparkles size={13} color="#17233F" strokeWidth={2.8} />
          </motion.span>
        )}
      </motion.div>

      <div className={compact ? 'min-w-0 flex-1 text-left' : 'w-full text-center'}>
        <p className="text-[9px] font-black tracking-[0.12em]" style={{ color: '#6558D9' }}>{STATE_LABELS[state]}</p>
        <AnimatePresence mode="wait">
          {message && (
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`mt-1 font-extrabold leading-5 ${compact ? 'text-xs' : 'text-[11px]'}`}
              style={{ color: '#17233F' }}
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
