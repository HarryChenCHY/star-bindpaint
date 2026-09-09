'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ImagePlus, LoaderCircle, RefreshCw, Upload } from 'lucide-react';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif';
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/x-ms-bmp', 'image/avif']);

interface ImageUploaderProps {
  onImageLoaded: (img: HTMLImageElement, file: File) => void;
  onLoadingChange: (loading: boolean) => void;
  preview: string | null;
}

export default function ImageUploader({ onImageLoaded, onLoadingChange, preview }: ImageUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const cancelReadRef = useRef<(() => void) | null>(null);
  const dragDepthRef = useRef(0);
  const descriptionId = useId();

  useEffect(() => () => cancelReadRef.current?.(), []);

  const handleFiles = (files: FileList) => {
    if (!files.length) return;
    cancelReadRef.current?.();
    cancelReadRef.current = null;
    setLoading(false);
    onLoadingChange(false);
    if (files.length !== 1) {
      setError('每次请选择一张图片。');
      return;
    }
    const file = files[0];
    const supported = IMAGE_TYPES.has(file.type.toLowerCase())
      || (!file.type && /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name));
    if (!supported) {
      setError('请选择 JPG、PNG、WebP、GIF、BMP 或 AVIF 图片。');
      return;
    }
    if (file.size >= MAX_IMAGE_BYTES) {
      setError('图片需小于 20 MB，请压缩后重新选择。');
      return;
    }
    if (file.size === 0) {
      setError('这张图片是空文件，请重新选择。');
      return;
    }

    setError('');
    setLoading(true);
    onLoadingChange(true);
    let release = () => {};
    const finish = () => {
      release();
      cancelReadRef.current = null;
      setLoading(false);
      onLoadingChange(false);
    };
    try {
      const url = URL.createObjectURL(file);
      const image = new Image();
      release = () => {
        image.onload = null;
        image.onerror = null;
        image.src = '';
        URL.revokeObjectURL(url);
      };
      cancelReadRef.current = release;
      image.onload = () => {
        try {
          if (!image.naturalWidth || !image.naturalHeight) throw new Error('图片没有有效尺寸。');
          onImageLoaded(image, file);
        } catch (err) {
          setError(err instanceof Error ? err.message : '图片处理失败，请换一张重试。');
        } finally {
          finish();
        }
      };
      image.onerror = () => {
        setError('无法读取这张图片，文件可能已损坏或格式不受浏览器支持，请尝试 JPG 或 PNG。');
        finish();
      };
      image.src = url;
    } catch {
      setError('无法读取这张图片，请换一张重试。');
      finish();
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        aria-label="选择本地参考图片"
        onChange={event => {
          if (event.target.files) handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <motion.button
        type="button"
        initial={false}
        animate={{ scale: dragging ? 1.01 : 1 }}
        aria-label={preview ? '更换本地参考图片' : '选择本地图片或拖拽到此处'}
        aria-describedby={descriptionId}
        aria-busy={loading}
        className="relative flex min-h-[320px] w-full flex-col items-center justify-center overflow-hidden rounded-[1.75rem] p-6 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6558D9]"
        style={{
          border: `2px dashed ${dragging ? '#6558D9' : '#8E98AD'}`,
          background: dragging ? '#ECEAFE' : '#F6F7FB',
        }}
        onDragEnter={event => {
          event.preventDefault();
          dragDepthRef.current += 1;
          setDragging(true);
        }}
        onDragOver={event => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={event => {
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (!dragDepthRef.current) setDragging(false);
        }}
        onDrop={event => {
          event.preventDefault();
          dragDepthRef.current = 0;
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
      >
        {preview && <span className="pointer-events-none absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${preview})` }} role="img" aria-label="已上传参考图预览" />}
        {(preview || dragging) && <span className={`pointer-events-none absolute inset-0 ${preview ? 'bg-[#17233F]/65' : 'bg-[#ECEAFE]'}`} />}
        <span className="relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] text-[#17233F]" style={{ background: preview ? '#69D2C2' : '#FFD166', border: '2px solid #17233F', boxShadow: '4px 4px 0 #17233F' }}>
          {loading ? <LoaderCircle className="animate-spin" size={29} /> : preview ? <Check size={29} strokeWidth={3} /> : <ImagePlus size={29} strokeWidth={2.4} />}
        </span>
        <span className={`relative mt-7 text-lg font-black ${preview ? 'text-white' : 'text-[#17233F]'}`}>
          {dragging ? '松开鼠标，使用这张图片' : loading ? '正在读取图片…' : preview ? '图片已准备好' : '拖入图片，或点击选择'}
        </span>
        <span className={`relative mt-2 max-w-sm text-sm font-bold leading-6 ${preview ? 'text-white/90' : 'text-[#536079]'}`}>
          {preview ? '继续设置笔触与绘画引导，也可以拖入新图片' : '照片、插画都可以，选一张你想画的图片'}
        </span>
        <span className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-[#17233F] px-5 py-3 text-sm font-black text-white">
          {preview ? <RefreshCw size={16} /> : <Upload size={16} />}{preview ? '更换图片' : '选择本地图片'}
        </span>
      </motion.button>
      <p id={descriptionId} className="mt-3 text-xs font-bold leading-6 text-[#536079]">
        支持 JPG、PNG、WebP、GIF、BMP、AVIF，单张小于 20 MB。动图按静态画面处理。
        <span className="block">参考图在本机处理，用于笔触拆解和绘画指导。</span>
      </p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FFE3EC] px-4 py-3 text-sm font-bold text-[#9B2743]">{error}{preview && ' 当前仍保留上一张图片。'}</p>}
      <span className="sr-only" role="status">{loading ? '正在读取图片，请稍候' : preview ? '参考图已准备好，可以设置绘画引导' : ''}</span>
    </div>
  );
}
