'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { loadGallery, deleteFromGallery, clearGallery, GalleryItem } from '@/lib/gallery-store';
import StarrySprite from '@/components/StarrySprite';

export default function GalleryPage() {
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    setItems(loadGallery());
  }, []);

  const handleDelete = (id: string) => {
    deleteFromGallery(id);
    setItems(loadGallery());
    setSelectedItem(null);
  };

  const handleClear = () => {
    if (confirm('确定清空所有作品？')) {
      clearGallery();
      setItems([]);
    }
  };

  const handleDownload = (item: GalleryItem) => {
    const a = document.createElement('a');
    a.href = item.imageDataUrl;
    a.download = `${item.title}.png`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-10 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'rgba(237,233,254,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#EDE9FE')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(237,233,254,0.5)')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            返回
          </button>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#EDE9FE',
          }}>
            我的画廊
          </h1>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClear}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              color: 'rgba(239,68,68,0.75)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            清空全部
          </button>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <StarrySprite state="idle" message="还没有作品，快去创作吧！" />
          <button
            onClick={() => router.push('/')}
            className="btn-primary mt-2"
            style={{ paddingLeft: '1.75rem', paddingRight: '1.75rem' }}
          >
            开始创作
          </button>
        </div>
      )}

      {/* Gallery grid */}
      {items.length > 0 && (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1"
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.4)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(124,58,237,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
              onClick={() => setSelectedItem(item)}
            >
              <div className="aspect-square">
                <img
                  src={item.imageDataUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium truncate" style={{ color: '#EDE9FE', letterSpacing: '-0.01em' }}>
                  {item.title}
                </h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px]" style={{ color: 'rgba(237,233,254,0.35)' }}>
                    {new Date(item.date).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(237,233,254,0.35)' }}>
                    {item.strokeCount} 笔
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
              className="max-w-lg w-full p-6"
              style={{
                background: '#130F2D',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-card)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedItem.imageDataUrl}
                alt={selectedItem.title}
                className="w-full mb-4 object-cover"
                style={{ borderRadius: '1.25rem' }}
              />
              <h2 className="text-base font-semibold mb-1" style={{ color: '#EDE9FE', letterSpacing: '-0.02em' }}>
                {selectedItem.title}
              </h2>
              <p className="text-xs mb-5" style={{ color: 'rgba(237,233,254,0.4)' }}>
                {new Date(selectedItem.date).toLocaleDateString('zh-CN')} · {selectedItem.strokeCount} 笔 · {selectedItem.mode} 模式
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(selectedItem)}
                  className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.15)'; }}
                >
                  下载
                </button>
                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.22)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; }}
                >
                  删除
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-surface)', color: 'rgba(237,233,254,0.7)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
