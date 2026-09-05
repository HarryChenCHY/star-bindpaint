'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Brush, CalendarDays, ChevronLeft, Download, Flame, Sparkles, Trash, Trash2, X } from 'lucide-react';
import { loadGallery, deleteFromGallery, clearGallery, GalleryItem } from '@/lib/gallery-store';
import DailyWishCard from '@/components/DailyWishCard';
import MoonCompanion from '@/components/MoonCompanion';
import TiltedCard from '@/components/TiltedCard';
import { getPracticeOverview, PracticeOverview } from '@/lib/practice-store';

const MODE_COLOR: Record<string, string> = {
  follow: '#F9B801',
  auto: '#F302C9',
  free: '#7DC353',
};

const MODE_LABEL: Record<string, string> = {
  follow: '沿星迹',
  auto: '自动续画',
  free: '自由星域',
};

export default function GalleryPage() {
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [overview, setOverview] = useState<PracticeOverview | null>(null);

  useEffect(() => {
    const refresh = () => {
      setItems(loadGallery());
      setOverview(getPracticeOverview());
    };
    const frame = window.requestAnimationFrame(refresh);
    window.addEventListener('startrace-practice-updated', refresh);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('startrace-practice-updated', refresh);
    };
  }, []);

  const handleDelete = (id: string) => {
    deleteFromGallery(id);
    setItems(loadGallery());
    setSelected(null);
  };

  const handleClear = () => {
    if (confirm('确定清空所有星图作品？练习日期与连续动笔记录会保留。')) { clearGallery(); setItems([]); }
  };

  const handleDownload = (item: GalleryItem) => {
    const a = document.createElement('a');
    a.href = item.imageDataUrl;
    a.download = `${item.title}.png`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-8 py-4 sm:py-5 gap-2" style={{ borderBottom: '2px solid #1A1A1A' }}>
        <motion.button
          onClick={() => router.push('/')}
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 rounded-full"
          style={{
            background: '#FFFFFF',
            color: '#1A1A1A',
            border: '2px solid #1A1A1A',
            boxShadow: '3px 3px 0 #1A1A1A',
            padding: '0.5em 1.1em',
            fontWeight: 800,
            fontSize: '0.8rem',
            letterSpacing: '-0.01em',
          }}
        >
          <ChevronLeft size={16} strokeWidth={2.8} />
          返回
        </motion.button>
        <div className="flex items-center gap-2">
            <Sparkles color="#6558D9" size={18} strokeWidth={2.8} />
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(1rem, 3.6vw, 1.3rem)', letterSpacing: '-0.03em', color: '#1A1A1A', textTransform: 'uppercase' }}>
            我的星图
          </h1>
        </div>
        {items.length > 0
          ? (
            <motion.button
              onClick={handleClear}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 rounded-full"
              style={{
                background: '#FFFFFF',
                color: '#F302C9',
                border: '2px solid #1A1A1A',
                boxShadow: '3px 3px 0 #F302C9',
                padding: '0.5em 1.1em',
                fontWeight: 800,
                fontSize: '0.8rem',
                letterSpacing: '-0.01em',
              }}
            >
              <Trash size={14} strokeWidth={2.5} />
              清空作品
            </motion.button>
          )
          : <div style={{ width: '60px' }} />
        }
      </header>

      <div className="px-4 sm:px-8 py-6 sm:py-10 max-w-6xl mx-auto w-full flex-1">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <DailyWishCard compact onStart={() => router.push('/create')} onOpenStarMap={() => document.getElementById('star-map-grid')?.scrollIntoView({ behavior: 'smooth' })} />
          <div className="grid grid-cols-3 gap-2 rounded-[1.7rem] bg-white p-4 sm:p-5" style={{ border: '2px solid #17233F', boxShadow: '6px 6px 0 #69D2C2' }}>
            {[
              [Flame, `${overview?.currentStreak ?? 0} 天`, '连续动笔', '#FF8FAB'],
              [CalendarDays, String(overview?.totalSessions ?? 0), '完成练习', '#FFD166'],
              [Brush, String(overview?.totalUserStrokes ?? 0), '亲手笔触', '#69D2C2'],
            ].map(([Icon, value, label, color]) => {
              const StatIcon = Icon as typeof Flame;
              return (
                <div key={String(label)} className="flex min-w-0 flex-col items-center justify-center rounded-2xl px-2 py-4 text-center" style={{ background: '#F6F7FB' }}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: String(color), border: '1.5px solid #17233F' }}><StatIcon size={17} strokeWidth={2.7} /></span>
                  <p className="mt-3 text-lg font-black tracking-[-0.04em]" style={{ color: '#17233F' }}>{String(value)}</p>
                  <p className="mt-1 text-[9px] font-black tracking-[0.08em]" style={{ color: '#65708A' }}>{String(label)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div id="star-map-grid" className="mb-5 mt-10 flex scroll-mt-6 items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black tracking-[0.14em]" style={{ color: '#6558D9' }}>点亮过的世界</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]" style={{ color: '#17233F' }}>作品星图</h2>
          </div>
          <p className="text-xs font-bold" style={{ color: '#65708A' }}>{items.length} 颗作品星</p>
        </div>

        {/* Empty */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-6 rounded-[1.7rem] py-16" style={{ background: '#F6F7FB', border: '2px dashed #8E98AD' }}>
            <div className="max-w-xs rounded-[1.4rem] bg-white p-5" style={{ border: '2px solid #17233F', boxShadow: '5px 5px 0 #6558D9' }}>
              <MoonCompanion state="idle" message="星图还没有作品，从今天的第一笔开始点亮它。" />
            </div>
            <motion.button
              onClick={() => router.push('/create')}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-full flex items-center gap-2"
              style={{
                background: '#1A1A1A',
                color: '#FFFFFF',
                border: '2px solid #1A1A1A',
                boxShadow: '4px 4px 0 #F9B801',
                padding: '0.85em 2em',
                fontWeight: 900,
                fontSize: '0.92rem',
                letterSpacing: '-0.01em',
              }}
            >
              <Sparkles size={15} strokeWidth={2.5} />
              开始今日星愿 →
            </motion.button>
          </div>
        )}

        {/* Grid */}
        {items.length > 0 && (
          <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(item)}
                className="cursor-pointer"
              >
                <TiltedCard
                  containerHeight="auto"
                  containerWidth="100%"
                  imageHeight="auto"
                  imageWidth="100%"
                  rotateAmplitude={10}
                  scaleOnHover={1.04}
                  showTooltip
                  captionText={item.title}
                >
                  <div
                    className="rounded-[1.5rem] overflow-hidden bg-white w-full"
                    style={{ border: '2px solid #1A1A1A', boxShadow: '4px 4px 0 #1A1A1A' }}
                  >
                    <div className="aspect-square overflow-hidden" style={{ background: '#FFFFFF' }}>
                      <img src={item.imageDataUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-3 bg-white" style={{ borderTop: '2px solid #1A1A1A' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1A1A1A', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span style={{ fontSize: '0.7rem', color: '#888888', fontWeight: 600 }}>
                          {new Date(item.date).toLocaleDateString('zh-CN')}
                        </span>
                        <span className="rounded-full px-2 py-0.5" style={{ background: MODE_COLOR[item.mode] || '#F9B801', fontSize: '0.65rem', fontWeight: 800, color: '#1A1A1A', border: '1.5px solid #1A1A1A' }}>
                          {item.strokeCount}笔
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-extrabold" style={{ color: '#536079' }}>
                        <span>亲手 {item.userStrokeCount ?? item.strokeCount} 笔</span>
                        <span>{MODE_LABEL[item.mode] || '绘画'}</span>
                      </div>
                    </div>
                  </div>
                </TiltedCard>
              </motion.div>
            ))}
          </motion.div>
        )}

      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="max-w-md w-full rounded-[1.5rem] overflow-hidden"
              style={{ background: '#FFFFFF', border: '2px solid #1A1A1A' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ background: MODE_COLOR[selected.mode] || '#F9B801', height: '8px' }} />
              <div className="p-6">
                <img src={selected.imageDataUrl} alt={selected.title} className="w-full rounded-[1.25rem] mb-4 object-cover" style={{ border: '1.5px solid #E5E5E5' }} />
                <h2 style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.03em', color: '#1A1A1A', marginBottom: '0.25rem' }}>
                  {selected.title}
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#888888', fontWeight: 600, marginBottom: '1.25rem' }}>
                  {new Date(selected.date).toLocaleDateString('zh-CN')} · 共 {selected.strokeCount} 笔 · 亲手 {selected.userStrokeCount ?? selected.strokeCount} 笔 · {MODE_LABEL[selected.mode] || '绘画'}
                </p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => handleDownload(selected)}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex-1 rounded-full flex items-center justify-center gap-1.5"
                    style={{
                      background: '#1A1A1A',
                      color: '#FFFFFF',
                      border: '2px solid #1A1A1A',
                      boxShadow: '4px 4px 0 #7A51EC',
                      padding: '0.75em',
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    <Download size={15} strokeWidth={2.5} />
                    下载
                  </motion.button>
                  <motion.button
                    onClick={() => { if (confirm('确定删除这幅作品？')) handleDelete(selected.id); }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex-1 rounded-full flex items-center justify-center gap-1.5"
                    style={{
                      background: '#FFFFFF',
                      color: '#F302C9',
                      border: '2px solid #1A1A1A',
                      boxShadow: '4px 4px 0 #F302C9',
                      padding: '0.75em',
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    <Trash2 size={15} strokeWidth={2.5} />
                    删除
                  </motion.button>
                  <motion.button
                    onClick={() => setSelected(null)}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex-1 rounded-full flex items-center justify-center gap-1.5"
                    style={{
                      background: '#FFFFFF',
                      color: '#1A1A1A',
                      border: '2px solid #1A1A1A',
                      boxShadow: '4px 4px 0 #1A1A1A',
                      padding: '0.75em',
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    <X size={15} strokeWidth={2.8} />
                    关闭
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
