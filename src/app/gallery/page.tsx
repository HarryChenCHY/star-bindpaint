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
    <div className="flex-1 flex flex-col px-6 py-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-white/60 hover:text-white flex items-center gap-1 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            返回
          </button>
          <h1 className="text-2xl font-bold text-white">我的画廊</h1>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClear}
            className="px-4 py-1.5 rounded-full text-xs text-[#EF4444]/80 border border-[#EF4444]/20 hover:bg-[#EF4444]/10 transition-colors"
          >
            清空全部
          </button>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <StarrySprite state="idle" message="还没有作品，快去创作吧！" />
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-medium hover:scale-105 transition-transform"
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-white/[0.06] rounded-2xl border border-white/[0.1] overflow-hidden cursor-pointer hover:border-[#7C3AED]/50 hover:shadow-lg hover:shadow-[#7C3AED]/10 transition-all"
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
                <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[#94A3B8]">
                    {new Date(item.date).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1E1B4B] border border-white/10 rounded-3xl p-6 max-w-lg w-full"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedItem.imageDataUrl}
                alt={selectedItem.title}
                className="w-full rounded-2xl mb-4"
              />
              <h2 className="text-lg font-bold text-white">{selectedItem.title}</h2>
              <p className="text-sm text-[#94A3B8] mt-1">
                {new Date(selectedItem.date).toLocaleDateString('zh-CN')} · {selectedItem.strokeCount} 笔 · {selectedItem.mode}模式
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleDownload(selectedItem)}
                  className="flex-1 py-2 rounded-full bg-[#10B981]/20 text-[#10B981] text-sm font-medium hover:bg-[#10B981]/30"
                >
                  下载
                </button>
                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="flex-1 py-2 rounded-full bg-[#EF4444]/20 text-[#EF4444] text-sm font-medium hover:bg-[#EF4444]/30"
                >
                  删除
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-2 rounded-full bg-white/10 text-white/80 text-sm font-medium hover:bg-white/20"
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
