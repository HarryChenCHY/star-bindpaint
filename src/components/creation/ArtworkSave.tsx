'use client';

import { useState } from 'react';
import { Download, ImagePlus, Check } from 'lucide-react';
import ArtworkCredit from './ArtworkCredit';
import { saveToGallery } from '@/lib/gallery-store';

export default function ArtworkSave({ getCanvas, mode, disabled = false, strokeCount = 0 }: {
  getCanvas: () => HTMLCanvasElement | null;
  mode: 'co-create' | 'free';
  disabled?: boolean;
  strokeCount?: number;
}) {
  const [title, setTitle] = useState('今天的小小创作');
  const [author, setAuthor] = useState('');
  const [notice, setNotice] = useState('');
  function save(download: boolean) {
    const original = getCanvas();
    if (!original) return;
    try {
      const copy = document.createElement('canvas');
      copy.width = original.width; copy.height = original.height;
      const ctx = copy.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, copy.width, copy.height);
      ctx.drawImage(original, 0, 0);
      const imageDataUrl = copy.toDataURL('image/png');
      const name = title.trim() || '我的星迹作品';
      if (download) {
        const a = document.createElement('a'); a.href = imageDataUrl; a.download = `${name}.png`; a.click();
        setNotice('图片已准备下载。');
      } else {
        saveToGallery({ title: name, author: author.trim() || undefined, imageDataUrl, mode, strokeCount, userStrokeCount: mode === 'co-create' ? 0 : strokeCount });
        setNotice('已保存到当前浏览器的「我的星图」。');
      }
    } catch { setNotice('保存失败，浏览器空间可能不足，请尝试下载图片。'); }
  }
  return <section className="creation-card">
    <h2>留下这一刻</h2>
    <label className="creation-label">作品名称<input value={title} maxLength={60} onChange={e => setTitle(e.target.value)} /></label>
    <label className="creation-label">创作者署名（选填）<input value={author} maxLength={30} onChange={e => setAuthor(e.target.value)} aria-describedby="artwork-credit-note" /></label>
    <ArtworkCredit author={author.trim()} mode={mode} />
    <div className="creation-actions">
      <button disabled={disabled} onClick={() => save(false)}><ImagePlus size={16} /> 保存到星图</button>
      <button disabled={disabled} onClick={() => save(true)}><Download size={16} /> 下载图片</button>
    </div>
    <p id="artwork-credit-note" className="creation-note">署名保存在星图中，下载图片不添加水印。</p>
    <p className="creation-note">{mode === 'co-create' ? '保存当前已画出的内容，未确认的素材预览不会保存。' : '作品保存在当前浏览器，下载图片可单独留存。'}</p>
    {notice && <p role="status" className="creation-notice"><Check size={15} />{notice}</p>}
  </section>;
}
