'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface ImageUploaderProps {
  onImageLoaded: (img: HTMLImageElement) => void;
}

export default function ImageUploader({ onImageLoaded }: ImageUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    const img = new Image();
    img.onload = () => { onImageLoaded(img); };
    img.src = url;
  }, [onImageLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative rounded-[1.5rem] p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 min-h-[200px] max-w-md mx-auto w-full"
      style={{
        border: `2px dashed ${dragging ? '#7A51EC' : '#BBBBBB'}`,
        background: dragging ? 'rgba(122,81,236,0.06)' : '#FAFAFA',
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {preview ? (
        <img
          src={preview}
          alt="预览"
          className="max-h-[160px] rounded-xl object-contain"
          style={{ border: '1.5px solid #E5E5E5' }}
        />
      ) : (
        <>
          <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center"
            style={{ background: '#F9B801', border: '2px solid #1A1A1A' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1A1A1A' }}>点击或拖拽上传图片</p>
            <p style={{ fontSize: '0.8rem', color: '#888888', fontWeight: 600, marginTop: '0.25rem' }}>支持 JPG、PNG 格式</p>
          </div>
        </>
      )}
    </motion.div>
  );
}
