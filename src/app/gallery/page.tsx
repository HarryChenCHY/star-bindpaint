'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { loadGallery, deleteFromGallery, clearGallery, GalleryItem } from '@/lib/gallery-store';
import StarrySprite from '@/components/StarrySprite';
import { MiniStar } from '@/components/Characters';

const MODE_COLOR: Record<string, string> = {
  follow: '#F9B801',
  auto: '#F302C9',
  free: '#7DC353',
};

export default function GalleryPage() {
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  useEffect(() => { setItems(loadGallery()); }, []);

  const handleDelete = (id: string) => {
    deleteFromGallery(id);
    setItems(loadGallery());
    setSelected(null);
  };

  const handleClear = () => {
    if (confirm('确定清空所有作品？')) { clearGallery(); setItems([]); }
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
      <header className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '2px solid #1A1A1A' }}>
        <button onClick={() => router.push('/')} style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>
          ← 返回
        </button>
        <div className="flex items-center gap-2">
          <MiniStar color="#F9B801" size={18} />
          <h1 style={{ fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-0.03em', color: '#1A1A1A', textTransform: 'uppercase' }}>
            我的画廊
          </h1>
        </div>
        {items.length > 0
          ? <button onClick={handleClear} style={{ fontWeight: 700, fontSize: '0.8rem', color: '#F302C9', border: '1.5px solid #F302C9', borderRadius: '6rem', padding: '0.4em 1.1em' }}>清空</button>
          : <div style={{ width: '60px' }} />
        }
      </header>

      <div className="px-8 py-10 max-w-5xl mx-auto w-full flex-1">
        {/* Empty */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-6 py-20">
            <StarrySprite state="idle" message="还没有作品，快去创作吧！" />
            <button onClick={() => router.push('/create')} className="btn-black" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
              开始创作 →
            </button>
          </div>
        )}

        {/* Grid */}
        {items.length > 0 && (
          <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-[1.5rem] overflow-hidden cursor-pointer group"
                style={{ border: '2px solid #1A1A1A' }}
                onClick={() => setSelected(item)}
              >
                <div className="aspect-square overflow-hidden" style={{ background: MODE_COLOR[item.mode] || '#F9B801' }}>
                  <img src={item.imageDataUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3 bg-white">
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1A1A1A', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span style={{ fontSize: '0.7rem', color: '#888888', fontWeight: 600 }}>
                      {new Date(item.date).toLocaleDateString('zh-CN')}
                    </span>
                    <span className="rounded-full px-2 py-0.5" style={{ background: MODE_COLOR[item.mode] || '#F9B801', fontSize: '0.65rem', fontWeight: 800, color: '#1A1A1A' }}>
                      {item.strokeCount}笔
                    </span>
                  </div>
                </div>
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
                  {new Date(selected.date).toLocaleDateString('zh-CN')} · {selected.strokeCount} 笔 · {selected.mode} 模式
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleDownload(selected)} className="btn-black flex-1" style={{ fontSize: '0.9rem', padding: '0.7em' }}>
                    下载
                  </button>
                  <button onClick={() => handleDelete(selected.id)} className="flex-1 rounded-full font-bold text-sm py-3"
                    style={{ background: '#FFF0F0', color: '#F302C9', border: '1.5px solid #F302C9', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
                    删除
                  </button>
                  <button onClick={() => setSelected(null)} className="flex-1 rounded-full font-bold text-sm py-3"
                    style={{ background: '#F5F5F5', color: '#1A1A1A', border: '1.5px solid #1A1A1A', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
                    关闭
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
