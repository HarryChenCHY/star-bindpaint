'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Flame, Moon, Sparkles } from 'lucide-react';
import { getPracticeOverview, PracticeOverview } from '@/lib/practice-store';

interface DailyWishCardProps {
  onStart: () => void;
  onOpenStarMap: () => void;
  compact?: boolean;
}

export default function DailyWishCard({ onStart, onOpenStarMap, compact = false }: DailyWishCardProps) {
  const [overview, setOverview] = useState<PracticeOverview | null>(null);

  useEffect(() => {
    const refresh = () => setOverview(getPracticeOverview());
    refresh();
    window.addEventListener('startrace-practice-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('startrace-practice-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!overview) return <div className="h-44 animate-pulse rounded-[1.6rem]" style={{ background: '#ECEAFE' }} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[1.7rem] ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
      style={{ background: overview.todayCompleted ? '#E4F7F2' : '#ECEAFE', border: '2px solid #17233F', boxShadow: '6px 6px 0 #17233F' }}
    >
      <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full" style={{ background: overview.todayCompleted ? '#69D2C2' : '#FFD166', opacity: 0.55 }} />
      <div className="relative flex items-start gap-4">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl" style={{ background: '#FFD166', border: '2px solid #17233F', boxShadow: '3px 3px 0 #6558D9' }}>
          {overview.todayCompleted ? <Check size={24} strokeWidth={3} /> : <Moon size={25} strokeWidth={2.7} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black tracking-[0.14em]" style={{ color: '#6558D9' }}>今日星愿</p>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black" style={{ background: '#FFFFFF', border: '1.5px solid #17233F' }}>
              <Flame size={11} color="#FF8FAB" fill="#FF8FAB" /> 连续 {overview.currentStreak} 天
            </span>
          </div>
          <h2 className={`${compact ? 'mt-2 text-lg' : 'mt-2 text-xl sm:text-2xl'} font-black tracking-[-0.04em]`} style={{ color: '#17233F' }}>
            {overview.todayCompleted ? '今天的星星已经点亮' : overview.todayWish.title}
          </h2>
          <p className="mt-2 text-sm font-bold leading-6" style={{ color: '#536079' }}>
            {overview.todayCompleted ? '你已经完成今日练习，可以去星图回看这次动笔。' : overview.todayWish.description}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-label="最近七天动笔记录">
          {overview.recentDays.map(day => (
            <div key={day.dateKey} className="text-center">
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black" title={`${day.dateKey}${day.active ? ' 已动笔' : ' 未动笔'}`} style={{ background: day.active ? '#FFD166' : '#FFFFFF', border: `1.5px solid ${day.isToday ? '#6558D9' : '#17233F'}`, color: '#17233F' }}>
                {day.active ? <Sparkles size={12} /> : day.label}
              </span>
            </div>
          ))}
        </div>
        <button type="button" onClick={overview.todayCompleted ? onOpenStarMap : onStart} className="inline-flex flex-none items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black text-white" style={{ background: '#17233F', boxShadow: '3px 3px 0 #FFD166' }}>
          {overview.todayCompleted ? '查看星图' : '开始星愿'} <ArrowRight size={14} strokeWidth={2.8} />
        </button>
      </div>
    </motion.div>
  );
}
