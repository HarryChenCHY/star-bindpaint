'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StarrySprite from '@/components/StarrySprite';
import ImageUploader from '@/components/ImageUploader';
import { MiniStar } from '@/components/Characters';
import { MASTER_ARTISTS, MOOD_OPTIONS, MasterArtist, Masterwork } from '@/lib/masterworks';

type SourceMode = 'masters' | 'upload';

export default function CreatePage() {
  const router = useRouter();
  const [sourceMode, setSourceMode] = useState<SourceMode>('masters');
  const [selectedArtist, setSelectedArtist] = useState<MasterArtist | null>(null);
  const [selectedWork, setSelectedWork] = useState<Masterwork | null>(null);
  const [selectedMood, setSelectedMood] = useState('original');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [roughness, setRoughness] = useState(2);

  // 选择大师作品后加载图片到 sessionStorage
  const handleSelectWork = (artist: MasterArtist, work: Masterwork) => {
    setSelectedWork(work);
    setSelectedArtist(artist);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 512;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (Math.max(w, h) > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      sessionStorage.setItem('star-bindpaint-source', canvas.toDataURL('image/jpeg', 0.9));
      sessionStorage.setItem('star-bindpaint-source-w', String(w));
      sessionStorage.setItem('star-bindpaint-source-h', String(h));
      sessionStorage.setItem('star-bindpaint-master', JSON.stringify({
        id: work.id,
        title: work.title,
        artist: artist.name,
      }));
      setImageLoaded(true);
    };
    img.src = work.image;
  };

  // 用户上传自己的图片
  const handleImageUploaded = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    const maxSize = 512;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (Math.max(w, h) > maxSize) {
      const scale = maxSize / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    sessionStorage.setItem('star-bindpaint-source', canvas.toDataURL('image/jpeg', 0.9));
    sessionStorage.setItem('star-bindpaint-source-w', String(w));
    sessionStorage.setItem('star-bindpaint-source-h', String(h));
    sessionStorage.removeItem('star-bindpaint-master');
    setSelectedArtist(null);
    setSelectedWork(null);
    setImageLoaded(true);
  };

  const handleStart = () => {
    sessionStorage.setItem('star-bindpaint-roughness', String(roughness));
    sessionStorage.setItem('star-bindpaint-mood', selectedMood);
    router.push('/paint');
  };

  const roughnessLabels = ['精细 ~800笔', '适中 ~300笔', '写意 ~100笔', '粗犷 ~50笔'];
  const ready = imageLoaded;

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '2px solid #1A1A1A' }}>
        <button onClick={() => router.push('/')} className="flex items-center gap-2"
          style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>
          ← 返回首页
        </button>
        <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
          选择画作
        </span>
        <div style={{ width: '80px' }} />
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full">

        {/* Source mode tabs */}
        <div className="flex gap-2 mb-8 justify-center">
          <button
            onClick={() => { setSourceMode('masters'); setImageLoaded(false); setSelectedWork(null); }}
            className="px-5 py-2.5 rounded-full text-sm transition-all"
            style={{
              fontWeight: 800,
              background: sourceMode === 'masters' ? '#1A1A1A' : '#F5F5F5',
              color: sourceMode === 'masters' ? '#FFFFFF' : '#1A1A1A',
              border: '2px solid #1A1A1A',
            }}
          >
            大师作品库
          </button>
          <button
            onClick={() => { setSourceMode('upload'); setImageLoaded(false); setSelectedWork(null); }}
            className="px-5 py-2.5 rounded-full text-sm transition-all"
            style={{
              fontWeight: 800,
              background: sourceMode === 'upload' ? '#1A1A1A' : '#F5F5F5',
              color: sourceMode === 'upload' ? '#FFFFFF' : '#1A1A1A',
              border: '2px solid #1A1A1A',
            }}
          >
            上传我的图片
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ===== 大师作品库 ===== */}
          {sourceMode === 'masters' && (
            <motion.div key="masters" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

              {/* 未选画家：展示画家列表 */}
              {!selectedArtist && (
                <div>
                  <p className="text-center mb-6" style={{ color: '#888', fontWeight: 700, fontSize: '0.95rem' }}>
                    选择一位大师，临摹他的经典作品
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {MASTER_ARTISTS.map((artist) => (
                      <motion.button
                        key={artist.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedArtist(artist)}
                        className="p-5 rounded-[1.5rem] text-left transition-all"
                        style={{ border: '2px solid #1A1A1A', background: 'white' }}
                      >
                        <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                          style={{ background: artist.color }}>
                          <span className="text-white text-lg font-bold">{artist.name[0]}</span>
                        </div>
                        <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A', letterSpacing: '-0.02em' }}>
                          {artist.name}
                        </h3>
                        <p style={{ fontSize: '0.72rem', color: '#AAA', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '2px' }}>
                          {artist.nameEn}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, marginTop: '6px', lineHeight: 1.4 }}>
                          {artist.style} · {artist.period}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* 已选画家：展示该画家的作品 */}
              {selectedArtist && !selectedWork && (
                <div>
                  <button
                    onClick={() => setSelectedArtist(null)}
                    style={{ fontWeight: 800, fontSize: '0.85rem', color: '#888', marginBottom: '16px' }}
                  >
                    ← 返回画家列表
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: selectedArtist.color }}>
                      <span className="text-white text-xl font-bold">{selectedArtist.name[0]}</span>
                    </div>
                    <div>
                      <h2 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#1A1A1A', letterSpacing: '-0.03em' }}>
                        {selectedArtist.name}的作品
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>{selectedArtist.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedArtist.works.map((work) => (
                      <motion.button
                        key={work.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelectWork(selectedArtist, work)}
                        className="rounded-[1.25rem] overflow-hidden text-left"
                        style={{ border: '2px solid #1A1A1A' }}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                          <img src={work.image} alt={work.title}
                            className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="p-3">
                          <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>{work.title}</h4>
                          <p style={{ fontSize: '0.7rem', color: '#AAA', fontWeight: 600 }}>{work.titleEn} · {work.year}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* 已选作品：显示预览 + 进入下一步 */}
              {selectedWork && (
                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={() => { setSelectedWork(null); setImageLoaded(false); }}
                    style={{ fontWeight: 800, fontSize: '0.85rem', color: '#888', alignSelf: 'flex-start' }}
                  >
                    ← 换一幅画
                  </button>

                  <div className="rounded-[1.5rem] overflow-hidden max-w-sm w-full" style={{ border: '2px solid #1A1A1A' }}>
                    <img src={selectedWork.image} alt={selectedWork.title} className="w-full" />
                    <div className="p-4 bg-white">
                      <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#1A1A1A' }}>
                        {selectedArtist?.name} ·《{selectedWork.title}》
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>
                        {selectedWork.titleEn}, {selectedWork.year}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== 上传模式 ===== */}
          {sourceMode === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center gap-6">
              <p style={{ color: '#888', fontWeight: 700, fontSize: '0.95rem' }}>
                上传你自己的图片，AI 将分析并生成笔触
              </p>
              <ImageUploader onImageLoaded={handleImageUploaded} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== 情绪色调选择（图片准备好后显示）===== */}
        {ready && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-[1.5rem]" style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#1A1A1A', marginBottom: '12px' }}>
              选择情绪色调
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, marginBottom: '16px' }}>
              为这幅画选择一种情绪氛围，让你的创作独一无二
            </p>
            <div className="flex gap-2 flex-wrap">
              {MOOD_OPTIONS.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className="px-4 py-2 rounded-full text-sm transition-all"
                  style={{
                    fontWeight: 700,
                    background: selectedMood === mood.id ? mood.color : 'white',
                    color: selectedMood === mood.id ? 'white' : '#1A1A1A',
                    border: `2px solid ${selectedMood === mood.id ? mood.color : '#E5E5E5'}`,
                  }}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== 笔触密度（图片准备好后显示）===== */}
        {ready && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mt-4 p-6 rounded-[1.5rem]" style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}>
            <div className="flex items-center justify-between mb-4">
              <label style={{ fontWeight: 800, fontSize: '1rem', color: '#1A1A1A' }}>笔触风格</label>
              <span className="rounded-full px-3 py-1" style={{ background: '#F9B801', fontSize: '0.75rem', fontWeight: 800, color: '#1A1A1A' }}>
                {roughnessLabels[roughness - 1]}
              </span>
            </div>
            <input type="range" min="1" max="4" step="1" value={roughness}
              onChange={e => setRoughness(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none"
              style={{ accentColor: '#7A51EC', background: '#DDD' }} />
            <div className="flex justify-between mt-2">
              {['精细', '适中', '写意', '粗犷'].map(l => (
                <span key={l} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#AAA' }}>{l}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== 开始按钮 ===== */}
        {ready && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex justify-center mt-8 mb-12">
            <button onClick={handleStart} className="btn-black"
              style={{ fontSize: '1.1rem', padding: '1em 3em' }}>
              开始创作 →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
