'use client';

/* eslint-disable @next/next/no-img-element */

import { motion } from 'framer-motion';

interface SDRenderResultProps {
  originalImage: string;
  renderedImage: string;
  style: string;
  duration: number;
  onClose: () => void;
  onSave: (imageBase64: string) => void;
  onFinish?: () => void;
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
        className="bg-white rounded-[2rem] p-4 sm:p-6 max-w-2xl w-full shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{ border: '2px solid #1A1A1A', pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="text-center mb-5">
          <h3 style={{ fontWeight: 900, fontSize: 'clamp(1.15rem, 5vw, 1.3rem)', color: '#1A1A1A' }}>
            ✨ 月亮伙伴的星光变换
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, marginTop: 4 }}>
            AI 用时 {Math.round(duration / 1000)} 秒生成 {style} 风格结果
          </p>
        </div>

        {/* Before / After 对比 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* 原图 */}
          <div className="flex-1">
            <p className="text-center mb-2" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              你的画
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '2px solid #E5E5E5' }}>
              <img src={originalImage} alt="原始画作" className="w-full object-contain bg-white" style={{ maxHeight: '30vh' }} />
            </div>
          </div>

          {/* 箭头 */}
          <div className="hidden sm:flex items-center">
            <span style={{ fontSize: '1.5rem', color: '#DDD' }}>→</span>
          </div>

          {/* 渲染结果 */}
          <div className="flex-1">
            <p className="text-center mb-2" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7A51EC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ✨ AI 风格版
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '2px solid #7A51EC', boxShadow: '0 4px 20px rgba(122,81,236,0.2)' }}>
              <img src={renderedImage} alt="AI渲染结果" className="w-full object-contain bg-white" style={{ maxHeight: '30vh' }} />
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="flex-1 rounded-full font-bold text-sm"
            style={{
              background: '#FFFFFF',
              color: '#1A1A1A',
              border: '2px solid #1A1A1A',
              boxShadow: '3px 3px 0 #1A1A1A',
              cursor: 'pointer',
              padding: '0.85em 1.2em',
            }}
          >
            继续画
          </button>
          <button
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); onSave(renderedImage); }}
            className="flex-1 rounded-full font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: '#1A1A1A',
              color: 'white',
              border: '2px solid #1A1A1A',
              boxShadow: '3px 3px 0 #7A51EC',
              cursor: 'pointer',
              padding: '0.85em 1.2em',
            }}
          >
            <span>🖼️</span> 放进星图
          </button>
          <button
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => {
              e.stopPropagation();
              if (onFinish) onFinish();
              else onClose();
            }}
            className="flex-1 rounded-full font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: '#7A51EC',
              color: 'white',
              border: '2px solid #1A1A1A',
              boxShadow: '3px 3px 0 #1A1A1A',
              cursor: 'pointer',
              padding: '0.85em 1.2em',
            }}
          >
            <span>✨</span> 完成创作
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
