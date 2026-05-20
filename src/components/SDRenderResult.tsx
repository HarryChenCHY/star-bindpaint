'use client';

import { motion } from 'framer-motion';

interface SDRenderResultProps {
  originalImage: string;
  renderedImage: string;
  style: string;
  duration: number;
  onClose: () => void;
  onSave: (imageBase64: string) => void;
  onFinish: (imageBase64: string) => void; // 保存并进入心理分析
}

export default function SDRenderResult({ originalImage, renderedImage, style, duration, onClose, onSave, onFinish }: SDRenderResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-white rounded-[2rem] p-6 max-w-2xl w-full shadow-2xl"
        style={{ border: '2px solid #1A1A1A', pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="text-center mb-5">
          <h3 style={{ fontWeight: 900, fontSize: '1.3rem', color: '#1A1A1A' }}>
            ✨ Starry 的魔法
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, marginTop: 4 }}>
            用时 {Math.round(duration / 1000)} 秒
          </p>
        </div>

        {/* Before / After 对比 */}
        <div className="flex gap-4 mb-6">
          {/* 原图 */}
          <div className="flex-1">
            <p className="text-center mb-2" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              你的画
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '2px solid #E5E5E5' }}>
              <img src={originalImage} alt="原始画作" className="w-full aspect-square object-contain bg-white" />
            </div>
          </div>

          {/* 箭头 */}
          <div className="flex items-center">
            <span style={{ fontSize: '1.5rem', color: '#DDD' }}>→</span>
          </div>

          {/* 渲染结果 */}
          <div className="flex-1">
            <p className="text-center mb-2" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7A51EC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ✨ 油画版
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '2px solid #7A51EC', boxShadow: '0 4px 20px rgba(122,81,236,0.2)' }}>
              <img src={renderedImage} alt="AI渲染结果" className="w-full aspect-square object-contain bg-white" />
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <button
              onPointerDown={(e) => { e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="flex-1 py-3 rounded-full font-bold text-sm"
              style={{ background: '#F5F5F5', color: '#1A1A1A', border: '2px solid #E5E5E5', cursor: 'pointer' }}
            >
              继续画
            </button>
            <button
              onPointerDown={(e) => { e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); onSave(renderedImage); }}
              className="flex-1 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: '#1A1A1A', color: 'white', border: '2px solid #1A1A1A', cursor: 'pointer' }}
            >
              <span>🖼️</span> 放进画廊
            </button>
          </div>
          <button
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); onFinish(renderedImage); }}
            className="w-full py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: '#7A51EC', color: 'white', border: '2px solid #7A51EC', cursor: 'pointer' }}
          >
            ✨ 完成创作，看看 Starry 的观察
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
