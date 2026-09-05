'use client';

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MasterBubbleProps {
  artistId: string;
  artistName: string;
  message: string;
  quote?: string;
  className?: string;
}

/**
 * 大师对话气泡：头像 + 对话框
 * 大师以第一人称跟小朋友说话
 */
export default function MasterBubble({ artistId, artistName, message, quote, className = '' }: MasterBubbleProps) {
  const [displayText, setDisplayText] = useState('');
  const [typing, setTyping] = useState(true);

  // 打字机效果
  useEffect(() => {
    setDisplayText('');
    setTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i <= message.length) {
        setDisplayText(message.slice(0, i));
      } else {
        setTyping(false);
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [message]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={`flex items-start gap-4 ${className}`}
    >
      {/* 头像 */}
      <div className="flex-shrink-0">
        <div
          className="w-14 h-14 rounded-full overflow-hidden"
          style={{ border: '3px solid #1A1A1A', boxShadow: '4px 4px 0 #1A1A1A' }}
        >
          <img
            src={`/master/${artistId}/image.png`}
            alt={artistName}
            className="w-full h-full object-cover"
            onError={(e) => {
              // fallback: 显示首字母
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <p className="text-center mt-1" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1A1A1A' }}>
          {artistName}
        </p>
      </div>

      {/* 对话气泡 */}
      <div className="flex-1 relative">
        <div
          className="rounded-2xl p-4 relative"
          style={{
            background: '#FFFBEB',
            border: '2px solid #1A1A1A',
            boxShadow: '3px 3px 0 #1A1A1A',
          }}
        >
          {/* 小三角 */}
          <div
            className="absolute -left-2 top-4 w-3 h-3 rotate-45"
            style={{ background: '#FFFBEB', borderLeft: '2px solid #1A1A1A', borderBottom: '2px solid #1A1A1A' }}
          />

          <p style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.7, fontWeight: 600 }}>
            {displayText}
            {typing && <span className="animate-pulse">|</span>}
          </p>
        </div>

        {/* 名言（打字完成后显示） */}
        <AnimatePresence>
          {!typing && quote && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 pl-2"
              style={{ fontSize: '0.75rem', color: '#AAA', fontStyle: 'italic', fontWeight: 600 }}
            >
              {quote}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
