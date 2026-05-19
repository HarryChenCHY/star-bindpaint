'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CaregiverTipsProps {
  currentState: 'painting' | 'stuck' | 'completed' | 'resting';
  mode: 'follow' | 'auto' | 'free';
}

const TIPS: Record<string, string[]> = {
  painting_follow: [
    '请不要评价"像不像"，可以说："我看到你在画线。"',
    '如果孩子停住了，可以轻声说："慢慢来，不着急。"',
    '可以安静地坐在旁边，让孩子感受你的陪伴。',
  ],
  painting_auto: [
    '可以和孩子一起看，指着画面说："看，这里有蓝色。"',
    '不需要解释太多，一起安静地观看也很好。',
    '如果孩子对某个部分感兴趣，可以说："你在看那里呀。"',
  ],
  painting_free: [
    '不要问"你在画什么"，可以说："我看到你用了很多颜色。"',
    '让孩子自由表达，不做任何纠正或建议。',
    '如果孩子不想说话，颜色和线条就是他的语言。',
  ],
  stuck: [
    '不要催促，可以给两个选择："继续画？还是休息一下？"',
    '可以轻轻碰碰孩子的手臂，让他知道你在。',
    '如果孩子看起来烦躁，帮他按"休息"按钮。',
  ],
  completed: [
    '可以说："你完成了！"不需要夸大赞美。',
    '问孩子："想看看你的画吗？"',
    '记录今天的状态，方便下次参考。',
  ],
  resting: [
    '让孩子按自己的节奏休息，不要催促回去。',
    '可以一起做深呼吸，不需要说话。',
    '尊重孩子的感受，休息本身就是进步。',
  ],
};

export default function CaregiverTips({ currentState, mode }: CaregiverTipsProps) {
  const [expanded, setExpanded] = useState(false);

  const key = currentState === 'painting' ? `painting_${mode}` : currentState;
  const tips = TIPS[key] || TIPS['painting_follow'];
  const currentTip = tips[Math.floor(Date.now() / 10000) % tips.length]; // 每 10 秒切换

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="mb-2 p-4 rounded-2xl max-w-[260px]"
            style={{ background: '#FFF9E6', border: '2px solid #F9B801', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <p style={{ fontWeight: 700, fontSize: '0.7rem', color: '#B8860B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              给陪伴者的建议
            </p>
            <p style={{ fontSize: '0.85rem', color: '#333', lineHeight: 1.6, fontWeight: 600 }}>
              {currentTip}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all"
        style={{
          background: expanded ? '#F9B801' : '#FFF9E6',
          border: '2px solid #F9B801',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
        title="陪伴者提示"
      >
        {expanded ? '×' : '👤'}
      </button>
    </div>
  );
}
