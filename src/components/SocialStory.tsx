'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialStoryProps {
  onComplete: () => void;
}

const STORY_PAGES = [
  { icon: '🖥️', text: '今天我们要用平板画画。' },
  { icon: '⭐', text: '有一个星星朋友叫 Starry，它会帮我。' },
  { icon: '☝️', text: '我会用手指在屏幕上画线。' },
  { icon: '✨', text: '屏幕上会出现引导线，我跟着它画。' },
  { icon: '👍', text: '如果画不好，没关系。我可以再试，或者跳过。' },
  { icon: '🖼️', text: '画完后，我能看到自己的画！准备好了吗？' },
];

export default function SocialStory({ onComplete }: SocialStoryProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);

  // 每页至少 3 秒才能翻页
  useEffect(() => {
    setCanAdvance(false);
    const timer = setTimeout(() => setCanAdvance(true), 2500);
    return () => clearTimeout(timer);
  }, [currentPage]);

  const handleNext = () => {
    if (!canAdvance) return;
    if (currentPage < STORY_PAGES.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      // 记录已看过
      localStorage.setItem('star-bindpaint-story-seen', 'true');
      onComplete();
    }
  };

  const page = STORY_PAGES[currentPage];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm px-6"
    >
      <div className="max-w-sm w-full flex flex-col items-center gap-8">
        {/* 进度点 */}
        <div className="flex gap-2">
          {STORY_PAGES.map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{ background: i <= currentPage ? '#7A51EC' : '#E5E5E5' }}
            />
          ))}
        </div>

        {/* 内容 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
              style={{ background: '#F5F5F5' }}
            >
              {page.icon}
            </div>
            <p style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1A1A1A', lineHeight: 1.6 }}>
              {page.text}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* 按钮 */}
        <button
          onClick={handleNext}
          disabled={!canAdvance}
          className="btn-black transition-opacity"
          style={{
            opacity: canAdvance ? 1 : 0.3,
            padding: '0.85em 2.5em',
            fontSize: '1rem',
          }}
        >
          {currentPage < STORY_PAGES.length - 1 ? '下一步 →' : '准备好了！'}
        </button>

        {/* 跳过 */}
        {currentPage < STORY_PAGES.length - 1 && (
          <button
            onClick={() => {
              localStorage.setItem('star-bindpaint-story-seen', 'true');
              onComplete();
            }}
            style={{ color: '#BBB', fontWeight: 600, fontSize: '0.8rem' }}
          >
            跳过引导
          </button>
        )}
      </div>
    </motion.div>
  );
}
