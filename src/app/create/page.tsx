'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarrySprite from '@/components/StarrySprite';
import ImageUploader from '@/components/ImageUploader';
import { MiniStar } from '@/components/Characters';

export default function CreatePage() {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [roughness, setRoughness] = useState(2);

  const handleImageLoaded = (img: HTMLImageElement) => {
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
    setImageLoaded(true);
  };

  const handleStart = () => {
    sessionStorage.setItem('star-bindpaint-roughness', String(roughness));
    router.push('/paint');
  };

  const roughnessLabels = ['精细 ~800笔', '适中 ~300笔', '写意 ~100笔', '粗犷 ~50笔'];

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '2px solid #1A1A1A' }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2"
          style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}
        >
          ← 返回首页
        </button>
        <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
          上传图片
        </span>
        <div style={{ width: '80px' }} />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8 max-w-2xl mx-auto w-full">

        {/* Sprite */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
          <StarrySprite state="idle" message={imageLoaded ? '图片准备好了！' : '上传图片开始吧~'} />
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MiniStar color="#F9B801" size={20} />
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', color: '#1A1A1A', textTransform: 'uppercase' }}>
              上传你的图片
            </h1>
            <MiniStar color="#7A51EC" size={20} />
          </div>
          <p style={{ color: '#888888', fontWeight: 700, fontSize: '0.95rem' }}>
            支持 JPG、PNG 格式，AI 将自动分析笔触
          </p>
        </motion.div>

        {/* Uploader */}
        <ImageUploader onImageLoaded={handleImageLoaded} />

        {/* Roughness */}
        {imageLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-6 rounded-[1.5rem]"
            style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}
          >
            <div className="flex items-center justify-between mb-4">
              <label style={{ fontWeight: 800, fontSize: '1rem', color: '#1A1A1A', letterSpacing: '-0.02em' }}>
                笔触风格
              </label>
              <span className="rounded-full px-3 py-1" style={{ background: '#F9B801', fontSize: '0.75rem', fontWeight: 800, color: '#1A1A1A' }}>
                {roughnessLabels[roughness - 1]}
              </span>
            </div>
            <input
              type="range" min="1" max="4" step="1" value={roughness}
              onChange={e => setRoughness(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none"
              style={{ accentColor: '#7A51EC', background: '#DDDDDD', cursor: 'pointer' }}
            />
            <div className="flex justify-between mt-2">
              {['精细', '适中', '写意', '粗犷'].map(l => (
                <span key={l} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#AAAAAA' }}>{l}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Buttons */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex gap-3">
          <button
            onClick={handleStart}
            disabled={!imageLoaded}
            className="btn-black"
            style={{ fontSize: '1.05rem', paddingLeft: '2.5rem', paddingRight: '2.5rem', paddingTop: '0.85em', paddingBottom: '0.85em' }}
          >
            开始创作 →
          </button>
          <button onClick={() => router.push('/gallery')} className="btn-purple">
            我的画廊
          </button>
        </motion.div>

        {/* Mode hint cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-3 w-full mt-2"
        >
          {[
            { icon: '✏️', title: '跟画', desc: 'AI 精灵引导', color: '#F9B801' },
            { icon: '▶️', title: '自动', desc: '观看 AI 作画', color: '#F302C9' },
            { icon: '🎨', title: '自由', desc: '随心创作', color: '#7DC353' },
          ].map((m, i) => (
            <div key={i} className="p-4 rounded-[1.25rem] text-center" style={{ border: '2px solid #1A1A1A' }}>
              <div className="w-10 h-10 rounded-[0.75rem] flex items-center justify-center text-xl mx-auto mb-2" style={{ background: m.color }}>
                {m.icon}
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1A1A1A' }}>{m.title}</div>
              <div style={{ fontSize: '0.7rem', color: '#888888', fontWeight: 600 }}>{m.desc}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
