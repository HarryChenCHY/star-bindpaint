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
    img.onload = () => {
      onImageLoaded(img);
    };
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
      className={`
        relative rounded-3xl border-2 border-dashed p-8
        flex flex-col items-center justify-center gap-4
        cursor-pointer transition-all duration-300
        min-h-[200px] max-w-md mx-auto w-full
        ${dragging
          ? 'border-accent bg-accent/10 scale-105'
          : 'border-white/20 bg-white/5 hover:border-primary-light hover:bg-white/8'}
      `}
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
        />
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary-light">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white font-medium">点击或拖拽上传图片</p>
            <p className="text-text-muted text-sm mt-1">支持 JPG、PNG 格式</p>
          </div>
        </>
      )}
    </motion.div>
  );
}
