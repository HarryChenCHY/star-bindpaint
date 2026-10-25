'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Images } from 'lucide-react';
import { useSceneTransition } from '@/components/motion/SceneTransition';
import CoCreationStudio from '@/components/creation/CoCreationStudio';
import FreeDrawingStudio from '@/components/creation/FreeDrawingStudio';
import '../creation.css';
export default function PaintPage() {
  const { isTransitioning } = useSceneTransition();
  // A new session tears down workers, animation frames and material state together.
  const [session, setSession] = useState(0);
  const resetCanvas = () => setSession(value => value + 1);
  const [entry, setEntry] = useState<{ mode: 'free' | 'co-create'; source: string | null } | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setEntry({ mode: sessionStorage.getItem('startrace-creation-mode') === 'free' ? 'free' : 'co-create', source: sessionStorage.getItem('startrace-creation-source') }); }
      catch { setEntry({ mode: 'co-create', source: null }); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className={`studio-page ${entry?.mode === 'free' ? 'paint-classic' : 'creation-shell'}`}><header className="creation-header"><Link href="/create"><ArrowLeft size={17} />创作入口</Link><Link href="/gallery"><Images size={17} />我的星图</Link></header><main className={entry?.mode === 'free' ? 'free-studio-container' : 'creation-container'}>{entry ? entry.mode === 'free' ? <FreeDrawingStudio key={session} onReset={resetCanvas} /> : <>{entry.source ? <CoCreationStudio autoStart={!isTransitioning} key={session} source={entry.source} onReset={resetCanvas} /> : <div className="photo-required"><h1>AI 共创需要一张照片</h1><p>请先上传照片，移动设备也可以拍照开始。</p><Link href="/create">选择照片</Link></div>}</> : <p role="status">正在打开画布…</p>}</main></div>;
}
