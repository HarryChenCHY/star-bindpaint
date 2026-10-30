'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Palette, Sparkles, Sparkle, Moon } from 'lucide-react';
import { useSceneTransition } from '@/components/motion/SceneTransition';
import ImageUploader from '@/components/ImageUploader';

export default function CreatePage() {
  const router = useRouter();
  const { begin, isTransitioning } = useSceneTransition();
  const [mode, setMode] = useState<'co-create' | 'free'>('co-create');
  const [source, setSource] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');

  function start() {
    if (isTransitioning) return;
    if (mode === 'co-create' && preparing) return;
    try {
      sessionStorage.setItem('startrace-creation-mode', mode);
      if (source && mode === 'co-create') sessionStorage.setItem('startrace-creation-source', source);
      else sessionStorage.removeItem('startrace-creation-source');
      begin(mode === 'co-create' ? 'paint' : 'free');
    } catch { setError('浏览器存储空间不足，请释放空间后重试。'); }
  }

  function prepare(image: HTMLImageElement, file: File) {
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    setSource(canvas.toDataURL('image/png')); setSourceTitle(file.name);
    setError('');
  }
  return <div className="night-page">
    <header className="night-header">
      <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm"><ArrowLeft size={18} />返回首页</button>
      <button onClick={() => router.push('/study')}>用户测试</button>
    </header>
    <main className="night-create">
      <h1>开始创作</h1>
      <p className="night-muted mt-3 text-center text-sm">让日常的画面，成为你的作品。</p>
      <div className="night-tabs" role="group" aria-label="创作方式">
        {([['co-create', Sparkles, 'AI 共创'], ['free', Palette, '自由画布']] as const).map(([id, Icon, label]) => <button key={id} aria-pressed={mode === id} onClick={() => { if (id === mode) return; setMode(id); setPreparing(false); setError(''); }}><Icon size={18} />{label}</button>)}
      </div>
      <section className="night-card motion-swap" key={mode}>
        {mode === 'co-create' ? <>
          <div className="creation-roles" aria-label="星月共创分工">
            <p><Sparkle size={16} strokeWidth={1.6} aria-hidden="true" /><span>贴图如星，点点缀于夜空；</span></p>
            <p><Moon size={16} strokeWidth={1.6} aria-hidden="true" /><span>AI 笔触似月华，在夜幕画布之上指引前路，照亮落笔的轨迹。</span></p>
            <p><svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 20h18M4 16a8 8 0 0 1 16 0M12 3v4M10 5h4M5 7v2M4 8h2M19 7v2M18 8h2" /></svg><span>星月偕行，共绘这一幅夜色长卷。</span></p>
          </div>
          <p className="night-muted mb-4 text-sm">参考图片（可选）。也可以直接开始，用素材编排画面。</p>
          <ImageUploader night allowCamera preview={source} onLoadingChange={setPreparing} onImageLoaded={prepare} />
          {source && <div className="night-muted mt-4 flex items-center justify-between gap-4 text-xs"><span className="truncate">{sourceTitle}</span><button className="min-h-11 shrink-0 underline underline-offset-4" onClick={() => { setSource(null); setSourceTitle(''); setError(''); }}>移除照片</button></div>}
          <button disabled={preparing || isTransitioning} onClick={start} className="night-primary mt-6 w-full">{preparing ? '正在读取图片…' : '开始共创'}<ArrowRight size={18} /></button>
        </> : <div className="py-10 text-center"><Palette size={32} className="night-muted mx-auto mb-6" /><h2 className="text-2xl">从一张白纸开始</h2><p className="night-muted mt-3 text-sm">选一种颜色，自由落笔。</p><button disabled={isTransitioning} onClick={start} className="night-primary mt-8">打开自由画布</button></div>}
        {error && <p role="alert" className="night-alert mt-4">{error}</p>}
      </section>
      <p className="night-muted mt-4 text-center text-xs">照片仅在当前设备处理</p>
    </main>
  </div>;
}
