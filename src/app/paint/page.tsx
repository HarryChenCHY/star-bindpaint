'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Images } from 'lucide-react';
import { useSceneTransition } from '@/components/motion/SceneTransition';
import CoCreationStudio from '@/components/creation/CoCreationStudio';
import FreeDrawingStudio from '@/components/creation/FreeDrawingStudio';
import StudioSession from '@/components/creation/StudioSession';
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
  return <StudioSession key={session}><div className={`studio-page ${entry?.mode === 'free' ? 'paint-classic' : 'creation-shell'}`}><header className="creation-header"><Link href="/create"><ArrowLeft size={17} />创作入口</Link><Link href="/gallery"><Images size={17} />我的星图</Link></header><main className={entry?.mode === 'free' ? 'free-studio-container' : 'creation-container'}>{entry ? entry.mode === 'free' ? <FreeDrawingStudio key={session} onReset={resetCanvas} /> : <CoCreationStudio autoStart={!isTransitioning} key={session} source={entry.source} onReset={resetCanvas} /> : <p role="status">正在打开画布…</p>}</main></div></StudioSession>;
}
