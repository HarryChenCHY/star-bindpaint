'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ImagePlus, RefreshCw, Upload } from 'lucide-react';

interface ImageUploaderProps {
  onImageLoaded: (img: HTMLImageElement) => void;
}

export default function ImageUploader({ onImageLoaded }: ImageUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请选择 JPG、PNG 或其他常见图片格式。');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setError('图片请小于 12 MB。');
      return;
    }

    setError('');
    const url = URL.createObjectURL(file);
    setPreview(current => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return url;
    });

    const image = new Image();
    image.onload = () => onImageLoaded(image);
    image.onerror = () => setError('无法读取这张图片，请换一张重试。');
    image.src = url;
  }, [onImageLoaded]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <motion.button
        type="button"
        initial={false}
        animate={{ scale: dragging ? 1.01 : 1 }}
        className="relative flex min-h-[320px] w-full flex-col items-center justify-center overflow-hidden rounded-[1.75rem] p-6 text-center"
        style={{
          border: `2px dashed ${dragging ? '#6558D9' : '#8E98AD'}`,
          background: dragging ? '#ECEAFE' : '#F6F7FB',
        }}
        onDragOver={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = '';
          }}
        />

        {preview ? (
          <>
            <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} role="img" aria-label="已上传参考图预览" />
            <div className="absolute inset-0 bg-[#17233F]/55" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#69D2C2] text-[#17233F]">
              <Check size={25} strokeWidth={3} />
            </span>
            <p className="relative mt-4 text-lg font-black text-white">图片已准备好</p>
            <p className="relative mt-2 text-sm font-bold text-white/70">点击重新选择，或继续设置绘画引导</p>
            <span className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#17233F]">
              <RefreshCw size={14} strokeWidth={2.6} /> 更换图片
            </span>
          </>
        ) : (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[#FFD166] text-[#17233F]" style={{ border: '2px solid #17233F', boxShadow: '4px 4px 0 #17233F' }}>
              <ImagePlus size={29} strokeWidth={2.4} />
            </span>
            <p className="mt-7 text-lg font-black text-[#17233F]">拖入图片，或点击选择</p>
            <p className="mt-2 max-w-sm text-sm font-bold leading-6 text-[#536079]">系统只会使用这张图片生成当前绘画所需的笔触路径。</p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#17233F] px-5 py-3 text-sm font-black text-white">
              <Upload size={16} strokeWidth={2.7} /> 选择图片
            </span>
          </>
        )}
      </motion.button>

      {error && <p className="mt-3 rounded-xl bg-[#FFE3EC] px-4 py-3 text-sm font-bold text-[#9B2743]">{error}</p>}
    </div>
  );
}
