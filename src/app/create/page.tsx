'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarrySprite from '@/components/StarrySprite';
import ImageUploader from '@/components/ImageUploader';

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
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    sessionStorage.setItem('star-bindpaint-source', dataUrl);
    sessionStorage.setItem('star-bindpaint-source-w', String(w));
    sessionStorage.setItem('star-bindpaint-source-h', String(h));
    setImageLoaded(true);
  };

  const handleStart = () => {
    sessionStorage.setItem('star-bindpaint-roughness', String(roughness));
    router.push('/paint');
  };

  const roughnessLabels = ['精细 (~800笔)', '适中 (~300笔)', '写意 (~100笔)', '粗犷 (~50笔)'];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-8">

      {/* Sprite */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 220, damping: 22 }}
      >
        <StarrySprite
          state="idle"
          message={imageLoaded ? '图片准备好了，开始创作吧！' : '上传一张图片开始吧~'}
        />
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.75rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#EDE9FE',
          lineHeight: 1,
        }}>
          星绘<span style={{ color: '#00FFA5' }}>智愈</span>
        </h1>
        <p className="mt-2 text-base" style={{ color: 'rgba(237,233,254,0.5)', letterSpacing: '-0.01em' }}>
          让每个人都能画出大师级油画
        </p>
      </motion.div>

      {/* Upload */}
      <ImageUploader onImageLoaded={handleImageLoaded} />

      {/* Roughness selector */}
      {imageLoaded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-sm w-full p-5"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium" style={{ color: '#EDE9FE', letterSpacing: '-0.02em' }}>
              笔触风格
            </label>
            <span className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(124,58,237,0.18)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.25)' }}>
              {roughnessLabels[roughness - 1]}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            value={roughness}
            onChange={e => setRoughness(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none"
            style={{ accentColor: '#7C3AED', background: 'rgba(255,255,255,0.1)' }}
          />
          <div className="flex justify-between mt-2">
            {['精细', '适中', '写意', '粗犷'].map(l => (
              <span key={l} className="text-[10px]" style={{ color: 'rgba(237,233,254,0.3)' }}>{l}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-3"
      >
        <button
          onClick={handleStart}
          disabled={!imageLoaded}
          className="btn-primary"
          style={{
            opacity: imageLoaded ? 1 : 0.35,
            cursor: imageLoaded ? 'pointer' : 'not-allowed',
            paddingLeft: '2rem',
            paddingRight: '2rem',
          }}
        >
          开始创作
        </button>
        <button
          onClick={() => router.push('/gallery')}
          className="btn-secondary"
        >
          我的画廊
        </button>
      </motion.div>

      {/* Mode intro cards */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mt-4"
      >
        {[
          { icon: '✏️', title: '跟画模式', desc: 'AI 精灵引导你一笔一笔画', accent: '#A78BFA' },
          { icon: '▶️', title: '自动模式', desc: '观看 AI 逐笔重建油画', accent: '#00FFA5' },
          { icon: '🎨', title: '自由模式', desc: '自由创作，精灵陪伴鼓励', accent: '#7C3AED' },
        ].map((item, i) => (
          <div
            key={i}
            className="p-4 text-center"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '1.25rem',
            }}
          >
            <div className="text-xl mb-2">{item.icon}</div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#EDE9FE', letterSpacing: '-0.02em' }}>{item.title}</h3>
            <p className="text-xs" style={{ color: 'rgba(237,233,254,0.4)' }}>{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
