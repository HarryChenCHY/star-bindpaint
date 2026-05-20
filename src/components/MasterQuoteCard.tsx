'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MASTER_DIALOGUES } from '@/lib/master-dialogues';

// 大师信息（名字+头像路径）
const MASTERS = [
  { id: 'monet', name: '莫奈', color: '#7BA7CC' },
  { id: 'vangogh', name: '梵高', color: '#F9B801' },
  { id: 'gauguin', name: '高更', color: '#F302C9' },
  { id: 'rembrandt', name: '伦勃朗', color: '#8B6914' },
  { id: 'picasso', name: '毕加索', color: '#7A51EC' },
  { id: 'sargent', name: '萨金特', color: '#7DC353' },
];

interface MasterQuoteCardProps {
  className?: string;
  variant?: 'default' | 'compact' | 'banner';
}

/**
 * 随机显示一位大师的名言卡片
 * variant:
 * - 'default': 头像+名字+名言（适合页面中间）
 * - 'compact': 只有名言+署名（适合边角）
 * - 'banner': 横幅式带背景色（适合顶部/底部）
 */
export default function MasterQuoteCard({ className = '', variant = 'default' }: MasterQuoteCardProps) {
  const [master, setMaster] = useState<typeof MASTERS[0] | null>(null);
  const [quote, setQuote] = useState('');

  useEffect(() => {
    const idx = Math.floor(Math.random() * MASTERS.length);
    const m = MASTERS[idx];
    setMaster(m);
    const dialogue = MASTER_DIALOGUES[m.id];
    if (dialogue) {
      // 随机选名言或者鼓励语
      const allQuotes = [
        dialogue.quote,
        ...dialogue.encouragements,
      ];
      setQuote(allQuotes[Math.floor(Math.random() * allQuotes.length)]);
    }
  }, []);

  if (!master || !quote) return null;

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`text-center py-4 ${className}`}
      >
        <p style={{ fontSize: '0.85rem', color: '#999', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.6 }}>
          {quote}
        </p>
        <p style={{ fontSize: '0.7rem', color: '#CCC', fontWeight: 700, marginTop: 4 }}>
          — {master.name}
        </p>
      </motion.div>
    );
  }

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`flex items-center gap-4 px-6 py-4 rounded-2xl ${className}`}
        style={{ background: `${master.color}12`, border: `1.5px solid ${master.color}30` }}
      >
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${master.color}` }}>
          <img src={`/master/${master.id}/image.png`} alt={master.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: '0.85rem', color: '#555', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.5 }}>
            {quote}
          </p>
          <p style={{ fontSize: '0.65rem', color: '#AAA', fontWeight: 700, marginTop: 2 }}>
            — {master.name}
          </p>
        </div>
      </motion.div>
    );
  }

  // default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`flex flex-col items-center text-center py-6 ${className}`}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden mb-3" style={{ border: `2.5px solid ${master.color}`, boxShadow: `0 2px 12px ${master.color}30` }}>
        <img src={`/master/${master.id}/image.png`} alt={master.name} className="w-full h-full object-cover" />
      </div>
      <p style={{ fontSize: '0.9rem', color: '#555', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.7, maxWidth: 320 }}>
        {quote}
      </p>
      <p style={{ fontSize: '0.7rem', color: '#BBB', fontWeight: 700, marginTop: 6 }}>
        — {master.name}
      </p>
    </motion.div>
  );
}
