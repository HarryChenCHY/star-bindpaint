'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface CalmBreathingProps {
  onReturn: () => void;
}

export default function CalmBreathing({ onReturn }: CalmBreathingProps) {
  const [ready, setReady] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
      style={{ background: '#F8FAFE' }}
    >
      {/* 呼吸圆圈 */}
      <motion.div
        animate={{ scale: [1, 1.5, 1.5, 1] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          times: [0, 0.4, 0.7, 1], // 4s 膨胀, 3s 保持, 3s 收缩
          ease: 'easeInOut',
        }}
        className="w-32 h-32 rounded-full"
        style={{
          background: 'radial-gradient(circle, #B8D4E8 0%, #7BA7CC 100%)',
          boxShadow: '0 0 40px rgba(123, 167, 204, 0.3)',
        }}
      />

      {/* 提示文字 */}
      <motion.p
        animate={{ opacity: [0.5, 1, 1, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, times: [0, 0.2, 0.5, 1] }}
        style={{ fontSize: '1.1rem', fontWeight: 600, color: '#7BA7CC' }}
      >
        慢慢呼吸...
      </motion.p>

      <p style={{ fontSize: '0.85rem', color: '#AAA', fontWeight: 600, textAlign: 'center', maxWidth: 240 }}>
        没关系，我们休息一下。<br />看着圆圈慢慢变大、变小。
      </p>

      {/* 返回按钮（延迟显示） */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 5 }} // 至少 5 秒后才显示
        onClick={() => setReady(true)}
        className="px-6 py-3 rounded-full transition-all"
        style={{
          background: ready ? '#7BA7CC' : '#E8F0F6',
          color: ready ? 'white' : '#7BA7CC',
          fontWeight: 700,
          fontSize: '0.9rem',
        }}
      >
        {ready ? '确定返回' : '准备好了'}
      </motion.button>

      {ready && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onReturn}
          className="btn-black"
          style={{ padding: '0.7em 2em' }}
        >
          继续画画
        </motion.button>
      )}
    </motion.div>
  );
}
