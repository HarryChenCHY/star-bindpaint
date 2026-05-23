'use client';

import { motion } from 'framer-motion';

interface SDRenderLoadingProps {
  styleName: string;
}

const sparkles = [
  { left: '12%', top: '18%', delay: 0 },
  { left: '82%', top: '20%', delay: 0.25 },
  { left: '20%', top: '72%', delay: 0.5 },
  { left: '76%', top: '70%', delay: 0.75 },
  { left: '50%', top: '12%', delay: 1 },
  { left: '42%', top: '82%', delay: 1.25 },
];

export default function SDRenderLoading({ styleName }: SDRenderLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, rgba(249,184,1,0.96), rgba(243,2,201,0.9), rgba(122,81,236,0.96))',
        pointerEvents: 'auto',
      }}
    >
      {sparkles.map((s, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ left: s.left, top: s.top, fontSize: i % 2 === 0 ? 28 : 20 }}
          animate={{ y: [0, -12, 0], rotate: [0, 18, -10, 0], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        >
          ✨
        </motion.span>
      ))}

      <motion.div
        initial={{ scale: 0.9, y: 18 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        className="relative w-full max-w-md rounded-[2rem] bg-white px-5 py-7 text-center sm:px-8"
        style={{ border: '3px solid #1A1A1A', boxShadow: '8px 8px 0 #1A1A1A' }}
      >
        <motion.div
          className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-[2rem]"
          style={{ background: '#F9B801', border: '3px solid #1A1A1A', boxShadow: '5px 5px 0 #1A1A1A' }}
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            style={{ fontSize: 54, lineHeight: 1 }}
            animate={{ y: [0, -5, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            🪄
          </motion.span>
        </motion.div>

        <h3 style={{ fontSize: 'clamp(1.35rem, 6vw, 2rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em' }}>
          魔法施工中
        </h3>
        <p className="mx-auto mt-3 max-w-xs" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A1A1A', lineHeight: 1.55 }}>
          Starry 正在帮你邀请一位著名的油画家先生，用 {styleName} 的灵感一起完成这幅画。
        </p>

        <div className="mt-6 overflow-hidden rounded-full bg-white" style={{ border: '2px solid #1A1A1A', height: 18 }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7DC353, #F9B801, #F302C9, #7A51EC)' }}
            animate={{ x: ['-65%', '110%'] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="mt-5 flex justify-center gap-3 text-2xl">
          {['🎨', '⭐', '🖌️'].map((item, i) => (
            <motion.span
              key={item}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.16 }}
            >
              {item}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
