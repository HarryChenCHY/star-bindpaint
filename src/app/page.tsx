'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarrySprite from '@/components/StarrySprite';
import ImageUploader from '@/components/ImageUploader';

export default function HomePage() {
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-8">
      {/* 精灵 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
      >
        <StarrySprite
          state="idle"
          message={imageLoaded ? "点击开始创作吧！" : "上传一张图片开始吧~"}
        />
      </motion.div>

      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#A78BFA] via-[#06B6D4] to-[#F59E0B] bg-clip-text text-transparent">
          星绘智愈
        </h1>
        <p className="text-[#94A3B8] mt-2 text-lg">
          让每个人都能画出大师级油画
        </p>
      </motion.div>

      {/* 上传 */}
      <ImageUploader onImageLoaded={handleImageLoaded} />

      {/* 笔触密度选择 */}
      {imageLoaded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.1] max-w-sm w-full"
        >
          <label className="text-sm text-white/80 block mb-2">
            笔触风格 <span className="text-[#94A3B8]">（值越小笔触越细密，画面越完整）</span>
          </label>
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            value={roughness}
            onChange={e => setRoughness(Number(e.target.value))}
            className="w-full accent-[#7C3AED] h-2 rounded-full appearance-none bg-white/10"
          />
          <div className="flex justify-between text-xs text-[#94A3B8] mt-1">
            <span>精细 (~800笔)</span>
            <span>适中 (~300笔)</span>
            <span>写意 (~100笔)</span>
            <span>粗犷 (~50笔)</span>
          </div>
        </motion.div>
      )}

      {/* 操作按钮 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex gap-4"
      >
        <button
          onClick={handleStart}
          disabled={!imageLoaded}
          className={`
            px-8 py-3 rounded-full font-bold text-white transition-all
            ${imageLoaded
              ? 'bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] hover:scale-105 hover:shadow-lg hover:shadow-[#7C3AED]/30'
              : 'bg-white/10 text-white/40 cursor-not-allowed'}
          `}
        >
          开始创作
        </button>
        <button
          onClick={() => router.push('/gallery')}
          className="px-6 py-3 rounded-full font-medium text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          我的画廊
        </button>
      </motion.div>

      {/* 特性介绍 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mt-8"
      >
        {[
          { icon: '✏️', title: '跟画模式', desc: 'AI 画笔精灵引导你一笔一笔画' },
          { icon: '▶️', title: '自动模式', desc: '观看 AI 逐笔重建油画' },
          { icon: '🎨', title: '自由模式', desc: '自由创作，精灵陪伴鼓励' },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white/[0.08] rounded-2xl p-4 border border-white/[0.12] text-center"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <h3 className="text-sm font-bold text-white">{item.title}</h3>
            <p className="text-xs text-[#94A3B8] mt-1">{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
